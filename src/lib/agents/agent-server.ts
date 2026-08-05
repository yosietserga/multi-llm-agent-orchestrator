/**
 * Agent swarm server — runs INSIDE the Next.js dev process (Node dual-stack).
 *
 * Orchestration brain for the Multi-LLM Agent Swarm. Hosts socket.io on port
 * 3003 and runs:
 *   - Per-room agents (legacy chat rooms)
 *   - Swarm tasks: an orchestrator fans out to parallel agents, each of which
 *     may spawn subagents (task tree).
 *   - Self-demo: launches GLM-only orchestrated tasks toward a main goal and
 *     produces a versioned Report tagged with model specs.
 *
 * Every log, finding, and report is tagged with { provider, model, modelVersion }.
 * The self-demo uses ONLY GLM (z-ai-web-dev-sdk), per the user's request.
 */
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import { ROOM_CONFIG, ROOM_BY_ID, AgentOutputSchema, CIRCUIT_FAILURE_THRESHOLD, STREAM_CHUNK_MS, STREAM_CHUNK_CHARS, type ToolName } from './config'
import { LLM_BY_ID, DEMO_MODEL_ID } from './models'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  Finding,
  MemoryEvent,
  DagPhase,
  SwarmTask,
  ModelSpec,
  ReportRow,
  TaskKind,
} from '../types'

const AGENT_PORT = 3003
type ZaiInstance = Awaited<ReturnType<typeof ZAI.create>>

interface AgentServerState {
  io: Server<ClientToServerEvents, ServerToClientEvents>
  zai: ZaiInstance | null
  ready: boolean
}

interface CircuitState {
  failures: number
  open: boolean
}
const circuit = new Map<string, CircuitState>()
const cancelTokens = new Map<string, { cancelled: boolean }>()

const DEMO_MODEL = LLM_BY_ID[DEMO_MODEL_ID]
export const DEMO_MODEL_SPEC: ModelSpec = {
  provider: DEMO_MODEL.provider,
  model: DEMO_MODEL.id,
  version: DEMO_MODEL.version,
  vendor: DEMO_MODEL.vendor,
}

const globalForAgent = globalThis as unknown as { __agentServer?: AgentServerState }

function circuitOf(id: string): CircuitState {
  let s = circuit.get(id)
  if (!s) {
    s = { failures: 0, open: false }
    circuit.set(id, s)
  }
  return s
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/* ----------------------------- persistence ----------------------------- */

async function persistMessage(roomId: string, role: string, content: string, spec: ModelSpec, taskId?: string): Promise<void> {
  try {
    await db.agentMessage.create({
      data: {
        roomId,
        taskId: taskId ?? null,
        role,
        content,
        tokenEst: Math.ceil(content.length / 4),
        provider: spec.provider,
        model: spec.model,
        modelVersion: spec.version,
      },
    })
    const count = await db.agentMessage.count({ where: { roomId } })
    if (count > 200) {
      const overflow = await db.agentMessage.findMany({
        where: { roomId },
        orderBy: { createdAt: 'asc' },
        take: count - 200,
        select: { id: true },
      })
      if (overflow.length) await db.agentMessage.deleteMany({ where: { id: { in: overflow.map((m) => m.id) } } })
    }
  } catch { /* best-effort */ }
}

async function persistFinding(roomId: string, taskId: string | null, severity: string, title: string, detail: string, spec: ModelSpec): Promise<void> {
  try {
    await db.finding.create({
      data: {
        roomId,
        taskId: taskId ?? null,
        severity,
        title: String(title).slice(0, 140),
        detail: String(detail).slice(0, 1200),
        validated: true,
        provider: spec.provider,
        model: spec.model,
        modelVersion: spec.version,
      },
    })
  } catch { /* best-effort */ }
}

async function persistMemory(roomId: string | null, taskId: string | null, kind: MemoryEvent['kind'], content: string): Promise<void> {
  try {
    await db.episodicMemory.create({
      data: { roomId: roomId ?? null, taskId: taskId ?? null, kind, content: String(content).slice(0, 1000) },
    })
    const count = await db.episodicMemory.count()
    if (count > 500) {
      const overflow = await db.episodicMemory.findMany({
        orderBy: { createdAt: 'asc' },
        take: count - 500,
        select: { id: true },
      })
      if (overflow.length) await db.episodicMemory.deleteMany({ where: { id: { in: overflow.map((m) => m.id) } } })
    }
  } catch { /* best-effort */ }
}

async function patchRoom(roomId: string, body: Record<string, unknown>): Promise<void> {
  try {
    await db.agentRoom.update({ where: { id: roomId }, data: body })
  } catch { /* best-effort */ }
}

async function createTaskRow(args: {
  parentId?: string | null
  roomId?: string | null
  title: string
  goal: string
  kind: TaskKind
  model: ModelSpec
  mainGoal?: string | null
  depth?: number
}): Promise<SwarmTask> {
  const row = await db.agentTask.create({
    data: {
      parentId: args.parentId ?? null,
      roomId: args.roomId ?? null,
      title: args.title,
      goal: args.goal,
      kind: args.kind,
      assignedModel: args.model.model,
      provider: args.model.provider,
      modelVersion: args.model.version,
      mainGoal: args.mainGoal ?? null,
      depth: args.depth ?? 0,
      status: 'queued',
      column: 'queued',
    },
  })
  return rowToTask(row, [])
}

function rowToTask(row: any, children: SwarmTask[]): SwarmTask {
  return {
    id: row.id,
    parentId: row.parentId ?? null,
    roomId: row.roomId ?? null,
    title: row.title,
    goal: row.goal,
    status: row.status,
    kind: row.kind,
    model: { provider: row.provider, model: row.assignedModel, version: row.modelVersion ?? '', vendor: LLM_BY_ID[row.assignedModel]?.vendor ?? row.provider },
    mainGoal: row.mainGoal ?? null,
    result: row.result ?? null,
    summary: row.summary ?? null,
    column: row.column,
    priority: row.priority ?? 0,
    depth: row.depth ?? 0,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    startedAt: row.startedAt instanceof Date ? row.startedAt.toISOString() : null,
    finishedAt: row.finishedAt instanceof Date ? row.finishedAt.toISOString() : null,
    durationMs: row.durationMs ?? null,
    children,
  }
}

async function updateTaskRow(id: string, body: Record<string, unknown>): Promise<void> {
  try {
    await db.agentTask.update({ where: { id }, data: body })
  } catch { /* best-effort */ }
}

async function fetchTaskTree(): Promise<SwarmTask[]> {
  const rows = await db.agentTask.findMany({ orderBy: { createdAt: 'asc' } })
  const byId = new Map<string, any>()
  for (const r of rows) byId.set(r.id, { ...r, children: [] as SwarmTask[] })
  const roots: any[] = []
  for (const r of rows) {
    if (r.parentId && byId.has(r.parentId)) {
      byId.get(r.parentId)!.children.push(byId.get(r.id)!)
    } else if (!r.parentId) {
      roots.push(byId.get(r.id)!)
    }
  }
  const build = (node: any): SwarmTask => rowToTask(node, (node.children ?? []).map(build))
  return roots.map(build)
}

/* ----------------------------- helpers ----------------------------- */

function broadcastMemory(io: Server<ClientToServerEvents, ServerToClientEvents>, roomId: string | null, taskId: string | null, kind: MemoryEvent['kind'], content: string, spec?: ModelSpec): MemoryEvent {
  const event: MemoryEvent = {
    id: genId('mem'),
    roomId,
    taskId,
    kind,
    content: spec ? `${content} [${spec.provider}/${spec.model}@${spec.version}]` : content,
    createdAt: new Date().toISOString(),
  }
  io.emit('memory:event', { event })
  void persistMemory(roomId, taskId, kind, event.content)
  return event
}

function extractJson(content: string): unknown {
  let text = content.trim()
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) text = fence[1].trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) text = text.slice(start, end + 1)
  return JSON.parse(text)
}

async function streamToRoom(io: Server<ClientToServerEvents, ServerToClientEvents>, roomId: string, content: string, token: { cancelled: boolean }): Promise<boolean> {
  for (let i = 0; i < content.length; i += STREAM_CHUNK_CHARS) {
    if (token.cancelled) return false
    io.emit('room:stream', { roomId, chunk: content.slice(i, i + STREAM_CHUNK_CHARS), done: false })
    await new Promise((r) => setTimeout(r, STREAM_CHUNK_MS))
  }
  if (token.cancelled) return false
  io.emit('room:stream', { roomId, chunk: '', done: true })
  return true
}

async function streamToTask(io: Server<ClientToServerEvents, ServerToClientEvents>, taskId: string, content: string, token: { cancelled: boolean }): Promise<boolean> {
  for (let i = 0; i < content.length; i += STREAM_CHUNK_CHARS) {
    if (token.cancelled) return false
    io.emit('task:stream', { taskId, chunk: content.slice(i, i + STREAM_CHUNK_CHARS), done: false })
    await new Promise((r) => setTimeout(r, STREAM_CHUNK_MS))
  }
  if (token.cancelled) return false
  io.emit('task:stream', { taskId, chunk: '', done: true })
  return true
}

/** Call the LLM (GLM via z-ai). Retries on 429 with exponential backoff. */
async function callLlm(state: AgentServerState, systemPrompt: string, userPrompt: string): Promise<{ content: string; raw: any }> {
  if (!state.zai) throw new Error('ZAI SDK not initialized')
  let lastErr: unknown
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const completion = await state.zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        thinking: { type: 'disabled' },
      })
      const content: string = completion?.choices?.[0]?.message?.content ?? ''
      return { content, raw: completion }
    } catch (err) {
      lastErr = err
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('429') || msg.includes('Too many requests')) {
        // Exponential backoff: 2s, 4s, 8s.
        const wait = 2000 * Math.pow(2, attempt - 1)
        await new Promise((r) => setTimeout(r, wait))
        continue
      }
      throw err
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('LLM call failed after retries')
}

/* ----------------------------- room runner (legacy) ----------------------------- */

async function runRoom(state: AgentServerState, roomId: string): Promise<void> {
  const room = ROOM_BY_ID[roomId]
  if (!room) return
  const io = state.io
  const cs = circuitOf(roomId)
  if (cs.open) {
    io.emit('room:tripped', { roomId, reason: 'circuit open — reset before retrying' })
    return
  }
  const token = { cancelled: false }
  cancelTokens.set(roomId, token)
  io.emit('room:status', { roomId, status: 'running', failures: cs.failures, circuitOpen: cs.open })
  void patchRoom(roomId, { status: 'running' })
  io.emit('dag:update', { phase: 'running' })
  broadcastMemory(io, roomId, null, 'event', `agent "${room.llm}" started cold-run on ${room.topic}`, DEMO_MODEL_SPEC)

  try {
    let toolContext = ''
    if (room.allowedTools.includes('web_search' as ToolName) && state.zai) {
      try {
        broadcastMemory(io, roomId, null, 'event', `invoking scoped tool: web_search("${room.topic}")`, DEMO_MODEL_SPEC)
        const results = await state.zai.functions.invoke('web_search', { query: room.topic, num: 3 })
        toolContext = results.map((r) => `- ${r.name}: ${r.snippet}`).join('\n').slice(0, 600)
        broadcastMemory(io, roomId, null, 'event', `web_search returned ${results.length} results (scoped)`, DEMO_MODEL_SPEC)
      } catch (err) {
        broadcastMemory(io, roomId, null, 'event', `web_search unavailable: ${(err as Error).message}`, DEMO_MODEL_SPEC)
      }
    }
    if (!state.zai) throw new Error('ZAI SDK not initialized')
    if (token.cancelled) return

    const systemPrompt =
      room.systemPrompt +
      '\n\nReturn ONLY compact JSON matching this exact contract, no prose, no markdown fences:\n' +
      '{"summary": string, "findings": [{"severity": "info"|"warn"|"critical", "title": string, "detail": string}]}'
    const userPrompt = room.taskPrompt + (toolContext ? `\n\nRelevant web context (scoped tool output):\n${toolContext}` : '')

    const { content } = await callLlm(state, systemPrompt, userPrompt)
    if (token.cancelled) return
    if (!content) throw new Error('empty completion from LLM')

    const completed = await streamToRoom(io, roomId, content, token)
    if (!completed) {
      broadcastMemory(io, roomId, null, 'event', `agent "${room.llm}" run cancelled by user`, DEMO_MODEL_SPEC)
      io.emit('room:status', { roomId, status: 'idle' })
      void patchRoom(roomId, { status: 'idle' })
      return
    }
    void persistMessage(roomId, 'assistant', content, DEMO_MODEL_SPEC)

    await commitAgentOutput(io, roomId, null, content, DEMO_MODEL_SPEC, cs)
  } catch (err) {
    handleRunError(io, roomId, null, room.llm, err, cs)
  } finally {
    cancelTokens.delete(roomId)
    maybeEmitDagMerged(io)
  }
}

/** Two-Phase Commit: parse + validate agent output, then persist findings. */
async function commitAgentOutput(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomId: string,
  taskId: string | null,
  content: string,
  spec: ModelSpec,
  cs: CircuitState,
): Promise<void> {
  let parsed: unknown
  try {
    parsed = extractJson(content)
  } catch (err) {
    io.emit('room:finding', {
      roomId,
      finding: { id: genId('find'), roomId, taskId, severity: 'warn', title: 'Agent output was not valid JSON', detail: (err as Error).message, validated: false, createdAt: new Date().toISOString() },
      phase: 'rejected',
      reason: 'invalid JSON',
    })
    broadcastMemory(io, roomId, taskId, 'finding', `output rejected: invalid JSON`, spec)
    io.emit('room:status', { roomId, status: 'done', failures: cs.failures, circuitOpen: cs.open })
    void patchRoom(roomId, { status: 'done' })
    if (taskId) void updateTaskRow(taskId, { status: 'done', finishedAt: new Date(), result: content })
    return
  }

  const result = AgentOutputSchema.safeParse(parsed)
  if (!result.success) {
    io.emit('room:finding', {
      roomId,
      finding: { id: genId('find'), roomId, taskId, severity: 'warn', title: 'Agent output failed schema contract', detail: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ').slice(0, 500), validated: false, createdAt: new Date().toISOString() },
      phase: 'rejected',
      reason: 'schema validation failed',
    })
    broadcastMemory(io, roomId, taskId, 'finding', `output rejected: schema contract mismatch (two-phase abort)`, spec)
    io.emit('room:status', { roomId, status: 'done', failures: cs.failures, circuitOpen: cs.open })
    void patchRoom(roomId, { status: 'done' })
    if (taskId) void updateTaskRow(taskId, { status: 'done', finishedAt: new Date(), result: content })
    return
  }

  io.emit('room:summary', { roomId, summary: result.data.summary })
  broadcastMemory(io, roomId, taskId, 'decision', `committed ${result.data.findings.length} findings (schema OK)`, spec)

  for (const f of result.data.findings) {
    const finding: Finding = {
      id: genId('find'),
      roomId,
      taskId,
      severity: f.severity,
      title: f.title,
      detail: f.detail,
      validated: true,
      provider: spec.provider,
      model: spec.model,
      modelVersion: spec.version,
      createdAt: new Date().toISOString(),
    }
    io.emit('room:finding', { roomId, finding, phase: 'committed' })
    if (taskId) io.emit('task:finding', { taskId, finding, phase: 'committed' })
    void persistFinding(roomId, taskId, f.severity, f.title, f.detail, spec)
    broadcastMemory(io, roomId, taskId, 'finding', `[${f.severity}] ${f.title}`, spec)
  }

  cs.failures = 0
  cs.open = false
  io.emit('room:status', { roomId, status: 'done', failures: 0, circuitOpen: false })
  void patchRoom(roomId, { status: 'done', failures: 0, circuitOpen: false })
  if (taskId) {
    void updateTaskRow(taskId, { status: 'done', finishedAt: new Date(), summary: result.data.summary, result: content, durationMs: undefined })
  }
}

function handleRunError(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomId: string,
  taskId: string | null,
  label: string,
  err: unknown,
  cs: CircuitState,
): void {
  const message = err instanceof Error ? err.message : 'unknown error'
  cs.failures += 1
  broadcastMemory(io, roomId, taskId, 'event', `agent "${label}" error (${cs.failures}/${CIRCUIT_FAILURE_THRESHOLD}): ${message}`, DEMO_MODEL_SPEC)
  if (cs.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    cs.open = true
    io.emit('room:tripped', { roomId, reason: `${cs.failures} consecutive failures: ${message}` })
    io.emit('room:status', { roomId, status: 'tripped', failures: cs.failures, circuitOpen: true })
    void patchRoom(roomId, { status: 'tripped', failures: cs.failures, circuitOpen: true })
    if (taskId) void updateTaskRow(taskId, { status: 'tripped', finishedAt: new Date() })
    broadcastMemory(io, roomId, taskId, 'event', `circuit-breaker OPEN for "${label}" — manual reset required`, DEMO_MODEL_SPEC)
  } else {
    io.emit('room:status', { roomId, status: 'error', failures: cs.failures, circuitOpen: cs.open })
    void patchRoom(roomId, { status: 'error', failures: cs.failures, circuitOpen: cs.open })
    if (taskId) void updateTaskRow(taskId, { status: 'blocked', finishedAt: new Date() })
  }
}

function maybeEmitDagMerged(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  const anyRunning = cancelTokens.size > 0
  if (!anyRunning) {
    io.emit('dag:update', { phase: circuit.size > 0 ? ('merged' as DagPhase) : ('idle' as DagPhase) })
  }
}

function resetRoom(io: Server<ClientToServerEvents, ServerToClientEvents>, roomId: string): void {
  const token = cancelTokens.get(roomId)
  if (token) token.cancelled = true
  cancelTokens.delete(roomId)
  const cs = circuitOf(roomId)
  cs.failures = 0
  cs.open = false
  io.emit('room:status', { roomId, status: 'idle', failures: 0, circuitOpen: false })
  void patchRoom(roomId, { status: 'idle', failures: 0, circuitOpen: false })
  broadcastMemory(io, roomId, null, 'event', `room reset — circuit closed, buffers cleared`, DEMO_MODEL_SPEC)
}

/* ----------------------------- SWARM + DEMO ----------------------------- */

const DEMO_SUBGOALS: { id: string; title: string; goal: string; system: string }[] = [
  {
    id: 'demo-architecture',
    title: 'Architecture Review Agent',
    goal: 'Review the multi-LLM agent swarm platform architecture (Next.js 16, socket.io in-process, Prisma SQLite, Zustand, Zod contracts). Identify the top 3 architectural risks and 3 strengths.',
    system: 'You are a principal software architect. Be concrete and cite layer names. Return ONLY compact JSON matching the contract.',
  },
  {
    id: 'demo-security',
    title: 'Security Audit Agent',
    goal: 'Security cold-run of the swarm platform: endpoint CRUD stores API keys, socket.io origin is open, Prisma writes are unbounded. Identify the top 3 security risks with remediations.',
    system: 'You are an application security engineer. Reason adversarially, report constructively. Return ONLY compact JSON matching the contract.',
  },
  {
    id: 'demo-features',
    title: 'Feature Completeness Agent',
    goal: 'Audit the platform against its claimed 100 skills, 10 MCP connectors, 6 LLMs, and 8 views (swarm/kanban/gantt/chat/skills/mcp/endpoints/reports). Identify 3 gaps between claimed and real.',
    system: 'You are a product engineer auditing feature completeness. Be honest about declarative vs invokable. Return ONLY compact JSON matching the contract.',
  },
  {
    id: 'demo-ux',
    title: 'UX & Accessibility Agent',
    goal: 'UX/a11y cold-run of the swarm GUI: sticky footer, keyboard nav, ARIA, responsive grid, color contrast. Identify the top 3 UX/a11y risks.',
    system: 'You are a senior UX/a11y engineer. Cite WCAG criteria where relevant. Return ONLY compact JSON matching the contract.',
  },
]

export async function runDemo(state: AgentServerState, mainGoal: string): Promise<void> {
  const io = state.io
  broadcastMemory(io, null, null, 'event', `DEMO LAUNCH — main goal: "${mainGoal}"`, DEMO_MODEL_SPEC)
  io.emit('dag:update', { phase: 'running' })

  // Ensure a persistent demo room exists (for finding FK + message FK).
  const DEMO_ROOM_ID = 'room-demo-swarm'
  try {
    await db.agentRoom.upsert({
      where: { id: DEMO_ROOM_ID },
      create: {
        id: DEMO_ROOM_ID,
        llm: 'glm',
        topic: 'demo-swarm',
        title: 'Demo · Swarm Orchestrator',
        systemPrompt: 'demo room',
        taskPrompt: mainGoal,
        allowedTools: '["llm","web_search","page_reader"]',
        schemaContract: '{}',
      },
      update: { taskPrompt: mainGoal },
    })
  } catch { /* best-effort */ }

  // Orchestrator task (root).
  const orchestrator = await createTaskRow({
    title: 'Orchestrator (GLM)',
    goal: mainGoal,
    kind: 'orchestrator',
    model: DEMO_MODEL_SPEC,
    mainGoal,
    depth: 0,
  })
  await updateTaskRow(orchestrator.id, { status: 'running', startedAt: new Date() })
  orchestrator.status = 'running'
  orchestrator.startedAt = new Date().toISOString()
  io.emit('task:upsert', { task: orchestrator })
  broadcastMemory(io, null, orchestrator.id, 'decision', `orchestrator dispatched ${DEMO_SUBGOALS.length} parallel agents (GLM-only)`, DEMO_MODEL_SPEC)

  // Fan out to parallel agents (subagents of the orchestrator).
  const contractPrompt =
    '\n\nReturn ONLY compact JSON matching this exact contract, no prose, no markdown fences:\n' +
    '{"summary": string, "findings": [{"severity": "info"|"warn"|"critical", "title": string, "detail": string}]}'

  const agentRuns = DEMO_SUBGOALS.map(async (sg, idx) => {
    // Stagger launches by 1.5s each to avoid GLM API 429 bursts.
    await new Promise((r) => setTimeout(r, idx * 1500))
    const task = await createTaskRow({
      parentId: orchestrator.id,
      title: sg.title,
      goal: sg.goal,
      kind: 'agent',
      model: DEMO_MODEL_SPEC,
      mainGoal,
      depth: 1,
    })
    await updateTaskRow(task.id, { status: 'running', startedAt: new Date() })
    task.status = 'running'
    task.startedAt = new Date().toISOString()
    io.emit('task:upsert', { task })
    broadcastMemory(io, null, task.id, 'event', `agent "${sg.title}" started (subagent of orchestrator)`, DEMO_MODEL_SPEC)

    const token = { cancelled: false }
    cancelTokens.set(`task-${task.id}`, token)
    try {
      const { content } = await callLlm(state, sg.system + contractPrompt, sg.goal)
      if (token.cancelled) return { task, content: '' }
      // Stream to the task result buffer (live).
      await streamToTask(io, task.id, content, token)
      // Commit via the room contract (use the demo room).
      const syntheticRoomId = DEMO_ROOM_ID
      await commitAgentOutput(io, syntheticRoomId, task.id, content, DEMO_MODEL_SPEC, circuitOf(task.id))
      return { task, content }
    } catch (err) {
      handleRunError(io, DEMO_ROOM_ID, task.id, sg.title, err, circuitOf(task.id))
      return { task, content: '' }
    } finally {
      cancelTokens.delete(`task-${task.id}`)
    }
  })

  const results = await Promise.all(agentRuns)

  // Each agent may spawn ONE subagent for deeper analysis (demonstrating subagents).
  const subagentRuns = results
    .filter((r) => r.content)
    .slice(0, 2)
    .map(async (r) => {
      const sub = await createTaskRow({
        parentId: r.task.id,
        title: `${r.task.title} → Deep Dive Subagent`,
        goal: `Deepen the analysis of the parent agent's findings. Propose 2 additional concrete recommendations aligned with the main goal: "${mainGoal}".`,
        kind: 'subagent',
        model: DEMO_MODEL_SPEC,
        mainGoal,
        depth: 2,
      })
      await updateTaskRow(sub.id, { status: 'running', startedAt: new Date() })
      sub.status = 'running'
      sub.startedAt = new Date().toISOString()
      io.emit('task:upsert', { task: sub })
      broadcastMemory(io, null, sub.id, 'event', `subagent spawned by "${r.task.title}"`, DEMO_MODEL_SPEC)
      try {
        const { content } = await callLlm(
          state,
          'You are a senior engineer performing a deep-dive. Return ONLY compact JSON matching the contract.' + contractPrompt,
          `Parent findings:\n${r.content.slice(0, 1200)}\n\nMain goal: ${mainGoal}`,
        )
        await streamToTask(io, sub.id, content, { cancelled: false })
        await commitAgentOutput(io, DEMO_ROOM_ID, sub.id, content, DEMO_MODEL_SPEC, circuitOf(sub.id))
      } catch (err) {
        handleRunError(io, DEMO_ROOM_ID, sub.id, 'subagent', err, circuitOf(sub.id))
      }
    })
  await Promise.all(subagentRuns)

  // Finalize orchestrator + produce versioned report.
  await updateTaskRow(orchestrator.id, { status: 'done', finishedAt: new Date() })
  const tree = await fetchTaskTree()
  io.emit('task:upsert', { task: tree.find((t) => t.id === orchestrator.id) ?? orchestrator })

  const findings = await db.finding.findMany({ where: { taskId: { not: null } }, orderBy: { createdAt: 'desc' } })
  const taskCount = await db.agentTask.count({ where: { mainGoal } })
  const reportBody = buildReportBody(mainGoal, results, findings)
  const report = await db.report.create({
    data: {
      title: `Swarm Report — ${mainGoal.slice(0, 60)}`,
      mainGoal,
      body: reportBody,
      provider: DEMO_MODEL_SPEC.provider,
      models: JSON.stringify([DEMO_MODEL_SPEC]),
      taskCount,
      findingCount: findings.length,
    },
  })
  const reportRow: ReportRow = {
    id: report.id,
    title: report.title,
    mainGoal: report.mainGoal,
    body: report.body,
    provider: report.provider,
    models: [DEMO_MODEL_SPEC],
    taskCount: report.taskCount,
    findingCount: report.findingCount,
    createdAt: report.createdAt instanceof Date ? report.createdAt.toISOString() : String(report.createdAt),
  }
  io.emit('report:new', { report: reportRow })
  broadcastMemory(io, null, orchestrator.id, 'decision', `DEMO COMPLETE — report generated (${taskCount} tasks, ${findings.length} findings)`, DEMO_MODEL_SPEC)
  io.emit('dag:update', { phase: 'merged' })
}

function buildReportBody(mainGoal: string, results: { task: SwarmTask; content: string }[], findings: any[]): string {
  const lines: string[] = []
  lines.push(`# Swarm Orchestration Report`)
  lines.push(``)
  lines.push(`**Main goal:** ${mainGoal}`)
  lines.push(``)
  lines.push(`**LLM model:** ${DEMO_MODEL_SPEC.vendor} ${DEMO_MODEL_SPEC.model} (${DEMO_MODEL_SPEC.version}, provider: ${DEMO_MODEL_SPEC.provider})`)
  lines.push(`**Demo constraint:** GLM-only (all agents and subagents)`)
  lines.push(``)
  lines.push(`## Executed agents (${results.length})`)
  for (const r of results) {
    lines.push(`### ${r.task.title}`)
    lines.push(`- model: ${DEMO_MODEL_SPEC.provider}/${DEMO_MODEL_SPEC.model}@${DEMO_MODEL_SPEC.version}`)
    lines.push(`- goal: ${r.task.goal}`)
    try {
      const parsed = extractJson(r.content) as any
      if (parsed?.summary) lines.push(`- summary: ${parsed.summary}`)
      if (Array.isArray(parsed?.findings)) {
        lines.push(`- findings:`)
        for (const f of parsed.findings) lines.push(`  - [${f.severity}] ${f.title} — ${f.detail}`)
      }
    } catch {
      lines.push(`- raw output: ${r.content.slice(0, 200)}…`)
    }
    lines.push(``)
  }
  lines.push(`## Persisted findings (${findings.length})`)
  for (const f of findings.slice(0, 12)) {
    lines.push(`- [${f.severity}] ${f.title} — ${f.detail} [${f.provider}/${f.model}@${f.modelVersion}]`)
  }
  lines.push(``)
  lines.push(`_Generated by the Multi-LLM Agent Swarm Platform (Next.js 16 + z-ai-web-dev-sdk)._`)
  return lines.join('\n')
}

/* ----------------------------- boot ----------------------------- */

async function bootServer(): Promise<AgentServerState> {
  const httpServer = createServer()
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    path: '/',
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  let zai: ZaiInstance | null = null
  try {
    zai = await ZAI.create()
    console.log('[agent-server] ZAI SDK initialized (GLM)')
  } catch (err) {
    console.error('[agent-server] ZAI SDK init failed:', err instanceof Error ? err.message : err)
  }

  io.on('connection', (socket) => {
    socket.emit('connect_ack', { dag: 'idle' })
    socket.on('start:room', (p) => {
      if (ROOM_BY_ID[p.roomId]) void runRoom(state, p.roomId)
    })
    socket.on('start:all', () => {
      broadcastMemory(io, null, null, 'event', `dispatcher: launching ${ROOM_CONFIG.length} room agents in parallel`, DEMO_MODEL_SPEC)
      void Promise.all(ROOM_CONFIG.map((r) => runRoom(state, r.id)))
    })
    socket.on('stop:room', (p) => {
      const t = cancelTokens.get(p.roomId)
      if (t) t.cancelled = true
    })
    socket.on('reset:room', (p) => resetRoom(io, p.roomId))
    socket.on('demo:launch', (p) => {
      void runDemo(state, p.mainGoal).catch((err) => {
        broadcastMemory(io, null, null, 'event', `demo failed: ${(err as Error).message}`, DEMO_MODEL_SPEC)
      })
    })
    socket.on('demo:stop', () => {
      for (const [, t] of cancelTokens) t.cancelled = true
      cancelTokens.clear()
    })
  })

  const state: AgentServerState = { io, zai, ready: false }
  await new Promise<void>((resolve) => {
    httpServer.listen(AGENT_PORT, () => {
      console.log(`[agent-server] socket.io listening on port ${AGENT_PORT} (path "/")`)
      resolve()
    })
  })
  state.ready = true
  return state
}

export async function getAgentServer(): Promise<AgentServerState> {
  if (globalForAgent.__agentServer && globalForAgent.__agentServer.ready) {
    return globalForAgent.__agentServer
  }
  globalForAgent.__agentServer = await bootServer()
  return globalForAgent.__agentServer
}

export async function ensureAgentServer(): Promise<{ ok: boolean; port: number; zai: boolean }> {
  try {
    const s = await getAgentServer()
    return { ok: s.ready, port: AGENT_PORT, zai: !!s.zai }
  } catch (err) {
    console.error('[agent-server] boot failed:', err instanceof Error ? err.message : err)
    return { ok: false, port: AGENT_PORT, zai: false }
  }
}
