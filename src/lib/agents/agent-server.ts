/**
 * Agent orchestration server — runs INSIDE the Next.js dev process.
 *
 * Why not a standalone mini-service? The sandbox reaps background processes
 * started by tool calls between invocations, and bun binds IPv4-only (the Caddy
 * gateway connects via IPv6 ::1, causing 502). Hosting socket.io inside the
 * persistent Next.js dev process (Node, dual-stack listen) solves both: the
 * server lives as long as `next dev`, and is reachable on IPv4 + IPv6.
 *
 * A globalThis guard ensures only one server instance exists across HMR.
 */
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import { ROOM_CONFIG, ROOM_BY_ID, AgentOutputSchema, CIRCUIT_FAILURE_THRESHOLD, STREAM_CHUNK_MS, STREAM_CHUNK_CHARS, type ToolName } from './config'
import type { ServerToClientEvents, ClientToServerEvents, Finding, MemoryEvent, DagPhase } from '../types'

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
  lastFailureAt: number | null
}

const globalForAgent = globalThis as unknown as { __agentServer?: AgentServerState }

const circuit = new Map<string, CircuitState>()
const cancelTokens = new Map<string, { cancelled: boolean }>()

function circuitOf(roomId: string): CircuitState {
  let s = circuit.get(roomId)
  if (!s) {
    s = { failures: 0, open: false, lastFailureAt: null }
    circuit.set(roomId, s)
  }
  return s
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/* ----------------------------- persistence (direct Prisma) ----------------------------- */

async function persistMessage(roomId: string, role: string, content: string): Promise<void> {
  try {
    await db.agentMessage.create({
      data: { roomId, role, content, tokenEst: Math.ceil(content.length / 4) },
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
  } catch {
    /* best-effort */
  }
}

async function persistFinding(roomId: string, severity: string, title: string, detail: string): Promise<void> {
  try {
    await db.finding.create({
      data: { roomId, severity, title: String(title).slice(0, 140), detail: String(detail).slice(0, 1200), validated: true },
    })
  } catch {
    /* best-effort */
  }
}

async function persistMemory(roomId: string | null, kind: MemoryEvent['kind'], content: string): Promise<void> {
  try {
    await db.episodicMemory.create({ data: { roomId: roomId ?? null, kind, content: String(content).slice(0, 1000) } })
    const count = await db.episodicMemory.count()
    if (count > 500) {
      const overflow = await db.episodicMemory.findMany({
        orderBy: { createdAt: 'asc' },
        take: count - 500,
        select: { id: true },
      })
      if (overflow.length) await db.episodicMemory.deleteMany({ where: { id: { in: overflow.map((m) => m.id) } } })
    }
  } catch {
    /* best-effort */
  }
}

async function patchRoom(roomId: string, body: Record<string, unknown>): Promise<void> {
  try {
    await db.agentRoom.update({ where: { id: roomId }, data: body })
  } catch {
    /* best-effort */
  }
}

/* ----------------------------- helpers ----------------------------- */

function broadcastMemory(io: Server<ClientToServerEvents, ServerToClientEvents>, roomId: string | null, kind: MemoryEvent['kind'], content: string): MemoryEvent {
  const event: MemoryEvent = {
    id: genId('mem'),
    roomId,
    kind,
    content,
    createdAt: new Date().toISOString(),
  }
  io.emit('memory:event', { event })
  void persistMemory(roomId, kind, content)
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

async function streamContent(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomId: string,
  content: string,
  token: { cancelled: boolean },
): Promise<boolean> {
  const chunkSize = STREAM_CHUNK_CHARS
  for (let i = 0; i < content.length; i += chunkSize) {
    if (token.cancelled) return false
    io.emit('room:stream', { roomId, chunk: content.slice(i, i + chunkSize), done: false })
    await new Promise((r) => setTimeout(r, STREAM_CHUNK_MS))
  }
  if (token.cancelled) return false
  io.emit('room:stream', { roomId, chunk: '', done: true })
  return true
}

/* ----------------------------- core: run a room ----------------------------- */

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
  broadcastMemory(io, roomId, 'event', `agent "${room.llm}" started cold-run on ${room.topic}`)

  try {
    // Least-privilege tool scoping: web_search only if permitted.
    let toolContext = ''
    if (room.allowedTools.includes('web_search' as ToolName) && state.zai) {
      try {
        broadcastMemory(io, roomId, 'event', `invoking scoped tool: web_search("${room.topic}")`)
        const results = await state.zai.functions.invoke('web_search', { query: room.topic, num: 3 })
        toolContext = results.map((r) => `- ${r.name}: ${r.snippet}`).join('\n').slice(0, 600)
        broadcastMemory(io, roomId, 'event', `web_search returned ${results.length} results (scoped)`)
      } catch (err) {
        broadcastMemory(io, roomId, 'event', `web_search unavailable: ${(err as Error).message}`)
      }
    }

    if (!state.zai) throw new Error('ZAI SDK not initialized')
    if (token.cancelled) return

    // Context Window Isolation: per-room message list.
    const messages = [
      {
        role: 'system' as const,
        content:
          room.systemPrompt +
          '\n\nReturn ONLY compact JSON matching this exact contract, no prose, no markdown fences:\n' +
          '{"summary": string, "findings": [{"severity": "info"|"warn"|"critical", "title": string, "detail": string}]}',
      },
      {
        role: 'user' as const,
        content: room.taskPrompt + (toolContext ? `\n\nRelevant web context (scoped tool output):\n${toolContext}` : ''),
      },
    ]

    const completion = await state.zai.chat.completions.create({ messages, thinking: { type: 'disabled' } })
    if (token.cancelled) return

    const content: string = completion?.choices?.[0]?.message?.content ?? ''
    if (!content) throw new Error('empty completion from LLM')

    const completed = await streamContent(io, roomId, content, token)
    if (!completed) {
      broadcastMemory(io, roomId, 'event', `agent "${room.llm}" run cancelled by user`)
      io.emit('room:status', { roomId, status: 'idle' })
      void patchRoom(roomId, { status: 'idle' })
      return
    }

    void persistMessage(roomId, 'assistant', content)

    // Two-Phase Commit: parse + validate.
    let parsed: unknown
    try {
      parsed = extractJson(content)
    } catch (err) {
      io.emit('room:finding', {
        roomId,
        finding: { id: genId('find'), roomId, severity: 'warn', title: 'Agent output was not valid JSON', detail: (err as Error).message, validated: false, createdAt: new Date().toISOString() },
        phase: 'rejected',
        reason: 'invalid JSON',
      })
      broadcastMemory(io, roomId, 'finding', `agent "${room.llm}" output rejected: invalid JSON`)
      io.emit('room:status', { roomId, status: 'done', failures: cs.failures, circuitOpen: cs.open })
      void patchRoom(roomId, { status: 'done' })
      return
    }

    const result = AgentOutputSchema.safeParse(parsed)
    if (!result.success) {
      io.emit('room:finding', {
        roomId,
        finding: { id: genId('find'), roomId, severity: 'warn', title: 'Agent output failed schema contract', detail: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ').slice(0, 500), validated: false, createdAt: new Date().toISOString() },
        phase: 'rejected',
        reason: 'schema validation failed',
      })
      broadcastMemory(io, roomId, 'finding', `agent "${room.llm}" output rejected: schema contract mismatch (two-phase abort)`)
      io.emit('room:status', { roomId, status: 'done', failures: cs.failures, circuitOpen: cs.open })
      void patchRoom(roomId, { status: 'done' })
      return
    }

    io.emit('room:summary', { roomId, summary: result.data.summary })
    broadcastMemory(io, roomId, 'decision', `agent "${room.llm}" committed ${result.data.findings.length} findings (schema OK)`)

    for (const f of result.data.findings) {
      const finding: Finding = { id: genId('find'), roomId, severity: f.severity, title: f.title, detail: f.detail, validated: true, createdAt: new Date().toISOString() }
      io.emit('room:finding', { roomId, finding, phase: 'committed' })
      void persistFinding(roomId, f.severity, f.title, f.detail)
      broadcastMemory(io, roomId, 'finding', `[${f.severity}] ${f.title}`)
    }

    cs.failures = 0
    cs.open = false
    io.emit('room:status', { roomId, status: 'done', failures: 0, circuitOpen: false })
    void patchRoom(roomId, { status: 'done', failures: 0, circuitOpen: false })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    cs.failures += 1
    cs.lastFailureAt = Date.now()
    broadcastMemory(io, roomId, 'event', `agent "${room.llm}" error (${cs.failures}/${CIRCUIT_FAILURE_THRESHOLD}): ${message}`)
    if (cs.failures >= CIRCUIT_FAILURE_THRESHOLD) {
      cs.open = true
      io.emit('room:tripped', { roomId, reason: `${cs.failures} consecutive failures: ${message}` })
      io.emit('room:status', { roomId, status: 'tripped', failures: cs.failures, circuitOpen: true })
      void patchRoom(roomId, { status: 'tripped', failures: cs.failures, circuitOpen: true })
      broadcastMemory(io, roomId, 'event', `circuit-breaker OPEN for "${room.llm}" — manual reset required`)
    } else {
      io.emit('room:status', { roomId, status: 'error', failures: cs.failures, circuitOpen: cs.open })
      void patchRoom(roomId, { status: 'error', failures: cs.failures, circuitOpen: cs.open })
    }
  } finally {
    cancelTokens.delete(roomId)
    maybeEmitDagMerged(io)
  }
}

function maybeEmitDagMerged(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  const anyRunning = ROOM_CONFIG.some((r) => {
    const t = cancelTokens.get(r.id)
    return !!t && !t.cancelled
  })
  if (!anyRunning) {
    const allTouched = ROOM_CONFIG.every((r) => circuit.get(r.id) !== undefined)
    const phase: DagPhase = allTouched ? 'merged' : 'idle'
    io.emit('dag:update', { phase })
  }
}

async function runAllRooms(state: AgentServerState): Promise<void> {
  broadcastMemory(state.io, null, 'event', `dispatcher: launching ${ROOM_CONFIG.length} agents in parallel`)
  await Promise.all(ROOM_CONFIG.map((r) => runRoom(state, r.id)))
}

function resetRoom(io: Server<ClientToServerEvents, ServerToClientEvents>, roomId: string): void {
  const token = cancelTokens.get(roomId)
  if (token) token.cancelled = true
  cancelTokens.delete(roomId)
  const cs = circuitOf(roomId)
  cs.failures = 0
  cs.open = false
  cs.lastFailureAt = null
  io.emit('room:status', { roomId, status: 'idle', failures: 0, circuitOpen: false })
  void patchRoom(roomId, { status: 'idle', failures: 0, circuitOpen: false })
  broadcastMemory(io, roomId, 'event', `room reset — circuit closed, buffers cleared`)
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
    console.log('[agent-server] ZAI SDK initialized')
  } catch (err) {
    console.error('[agent-server] ZAI SDK init failed:', err instanceof Error ? err.message : err)
  }

  io.on('connection', (socket) => {
    socket.emit('connect_ack', { rooms: [], memory: [], dag: 'idle' })
    socket.on('start:room', (p) => {
      if (ROOM_BY_ID[p.roomId]) void runRoom(state, p.roomId)
    })
    socket.on('start:all', () => void runAllRooms(state))
    socket.on('stop:room', (p) => {
      const t = cancelTokens.get(p.roomId)
      if (t) t.cancelled = true
    })
    socket.on('reset:room', (p) => resetRoom(io, p.roomId))
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

/** Returns the singleton agent server, booting it on first call. */
export async function getAgentServer(): Promise<AgentServerState> {
  if (globalForAgent.__agentServer && globalForAgent.__agentServer.ready) {
    return globalForAgent.__agentServer
  }
  globalForAgent.__agentServer = await bootServer()
  return globalForAgent.__agentServer
}

/** Non-throwing bootstrap — safe to call from an API route. */
export async function ensureAgentServer(): Promise<{ ok: boolean; port: number; zai: boolean }> {
  try {
    const s = await getAgentServer()
    return { ok: s.ready, port: AGENT_PORT, zai: !!s.zai }
  } catch (err) {
    console.error('[agent-server] boot failed:', err instanceof Error ? err.message : err)
    return { ok: false, port: AGENT_PORT, zai: false }
  }
}
