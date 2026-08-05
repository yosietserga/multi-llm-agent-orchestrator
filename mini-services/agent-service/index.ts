/**
 * agent-service — Multi-LLM Agent Orchestration (reference standalone design).
 *
 * ⚠️  NOTE: This standalone bun process is NOT the running instance in this
 *     sandbox. Two environment constraints forced the socket.io server to be
 *     hosted INSIDE the Next.js dev process instead (see
 *     `src/lib/agents/agent-server.ts`):
 *       1. The sandbox reaps background processes started by tool calls between
 *          invocations, so a standalone `bun --hot` process dies within ~60s.
 *       2. bun binds IPv4-only (`0.0.0.0`); the Caddy gateway connects via
 *          IPv6 `::1` (resolving `localhost`), which yields HTTP 502. Node's
 *          default `listen(port)` binds dual-stack, so the in-process server is
 *          reachable on both IPv4 and IPv6.
 *
 * This file is kept as the canonical standalone reference: in an environment
 * with a persistent process supervisor, run `bun run dev` here on port 3003.
 *
 * Design (9 research patterns):
 *   - Context Window Isolation (per-room message buffers, no cross-leak)
 *   - Typed Schema Contracts (Zod validation of agent output)
 *   - Circuit-Breaker (per-room failure isolation)
 *   - Least-Privilege Tool Scoping (only permitted skills invoked)
 *   - Two-Phase Commit (findings persisted only after schema validation)
 *   - Parallel DAG (Promise.all fan-out)
 *   - Shared Episodic Memory (broadcast to all clients)
 *
 * Uses z-ai-web-dev-sdk in the backend only.
 */
import { createServer } from 'http'
import { Server } from 'socket.io'
import ZAI from 'z-ai-web-dev-sdk'
import {
  ROOM_CONFIG,
  ROOM_BY_ID,
  AgentOutputSchema,
  CIRCUIT_FAILURE_THRESHOLD,
  STREAM_CHUNK_MS,
  STREAM_CHUNK_CHARS,
  type ToolName,
} from '../../src/lib/agents/config'
import type { ServerToClientEvents, ClientToServerEvents, Finding, MemoryEvent, DagPhase } from '../../src/lib/types'

const PORT = 3003
const NEXT_API = 'http://localhost:3000'

const httpServer = createServer()
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

let zai: Awaited<ReturnType<typeof ZAI.create>> | null = null

interface CircuitState {
  failures: number
  open: boolean
  lastFailureAt: number | null
}
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

/* ----------------------------- persistence ----------------------------- */

async function persistMessage(roomId: string, role: string, content: string): Promise<void> {
  try {
    await fetch(`${NEXT_API}/api/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role, content, tokenEst: Math.ceil(content.length / 4) }),
    })
  } catch {
    /* best-effort */
  }
}

async function persistFinding(roomId: string, severity: string, title: string, detail: string): Promise<void> {
  try {
    await fetch(`${NEXT_API}/api/findings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roomId, severity, title, detail, validated: true }),
    })
  } catch {
    /* best-effort */
  }
}

async function persistMemory(roomId: string | null, kind: MemoryEvent['kind'], content: string): Promise<void> {
  try {
    await fetch(`${NEXT_API}/api/memory`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roomId, kind, content }),
    })
  } catch {
    /* best-effort */
  }
}

async function patchRoom(roomId: string, body: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${NEXT_API}/api/rooms/${roomId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    /* best-effort */
  }
}

/* ----------------------------- helpers ----------------------------- */

function broadcastMemory(roomId: string | null, kind: MemoryEvent['kind'], content: string): MemoryEvent {
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
  // Strip markdown code fences.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) text = fence[1].trim()
  // Slice from first '{' to last '}'.
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) text = text.slice(start, end + 1)
  return JSON.parse(text)
}

async function streamContent(roomId: string, content: string, token: { cancelled: boolean }): Promise<boolean> {
  const chunkSize = STREAM_CHUNK_CHARS
  for (let i = 0; i < content.length; i += chunkSize) {
    if (token.cancelled) return false
    const chunk = content.slice(i, i + chunkSize)
    io.emit('room:stream', { roomId, chunk, done: false })
    await new Promise((r) => setTimeout(r, STREAM_CHUNK_MS))
  }
  if (token.cancelled) return false
  io.emit('room:stream', { roomId, chunk: '', done: true })
  return true
}

/* ----------------------------- core: run a room ----------------------------- */

async function runRoom(roomId: string): Promise<void> {
  const room = ROOM_BY_ID[roomId]
  if (!room) return

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
  broadcastMemory(roomId, 'event', `agent "${room.llm}" started cold-run on ${room.topic}`)

  try {
    // Optional tool: web_search (least-privilege — only if permitted).
    let toolContext = ''
    if (room.allowedTools.includes('web_search' as ToolName) && zai) {
      try {
        broadcastMemory(roomId, 'event', `invoking scoped tool: web_search("${room.topic}")`)
        const results = await zai.functions.invoke('web_search', { query: room.topic, num: 3 })
        toolContext = results
          .map((r) => `- ${r.name}: ${r.snippet}`)
          .join('\n')
          .slice(0, 600)
        broadcastMemory(roomId, 'event', `web_search returned ${results.length} results (scoped)`)
      } catch (err) {
        broadcastMemory(roomId, 'event', `web_search unavailable: ${(err as Error).message}`)
      }
    }

    if (!zai) throw new Error('ZAI SDK not initialized')
    if (token.cancelled) return

    // Context Window Isolation: each room builds its own message list.
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

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    })
    if (token.cancelled) return

    const content: string = completion?.choices?.[0]?.message?.content ?? ''
    if (!content) throw new Error('empty completion from LLM')

    // Simulated streaming for the live UX.
    const completed = await streamContent(roomId, content, token)
    if (!completed) {
      broadcastMemory(roomId, 'event', `agent "${room.llm}" run cancelled by user`)
      io.emit('room:status', { roomId, status: 'idle' })
      void patchRoom(roomId, { status: 'idle' })
      return
    }

    // Persist the raw assistant message.
    void persistMessage(roomId, 'assistant', content)

    // Two-Phase Commit: parse + validate against the typed schema contract.
    let parsed: unknown
    try {
      parsed = extractJson(content)
    } catch (err) {
      io.emit('room:finding', {
        roomId,
        finding: {
          id: genId('find'),
          roomId,
          severity: 'warn',
          title: 'Agent output was not valid JSON',
          detail: (err as Error).message,
          validated: false,
          createdAt: new Date().toISOString(),
        },
        phase: 'rejected',
        reason: 'invalid JSON',
      })
      broadcastMemory(roomId, 'finding', `agent "${room.llm}" output rejected: invalid JSON`)
      io.emit('room:status', { roomId, status: 'done', failures: cs.failures, circuitOpen: cs.open })
      void patchRoom(roomId, { status: 'done' })
      return
    }

    const result = AgentOutputSchema.safeParse(parsed)
    if (!result.success) {
      io.emit('room:finding', {
        roomId,
        finding: {
          id: genId('find'),
          roomId,
          severity: 'warn',
          title: 'Agent output failed schema contract',
          detail: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ').slice(0, 500),
          validated: false,
          createdAt: new Date().toISOString(),
        },
        phase: 'rejected',
        reason: 'schema validation failed',
      })
      broadcastMemory(roomId, 'finding', `agent "${room.llm}" output rejected: schema contract mismatch (two-phase abort)`)
      io.emit('room:status', { roomId, status: 'done', failures: cs.failures, circuitOpen: cs.open })
      void patchRoom(roomId, { status: 'done' })
      return
    }

    // Commit phase: output validated → persist findings + summary.
    io.emit('room:summary', { roomId, summary: result.data.summary })
    broadcastMemory(roomId, 'decision', `agent "${room.llm}" committed ${result.data.findings.length} findings (schema OK)`)

    for (const f of result.data.findings) {
      const finding: Finding = {
        id: genId('find'),
        roomId,
        severity: f.severity,
        title: f.title,
        detail: f.detail,
        validated: true,
        createdAt: new Date().toISOString(),
      }
      io.emit('room:finding', { roomId, finding, phase: 'committed' })
      void persistFinding(roomId, f.severity, f.title, f.detail)
      broadcastMemory(roomId, 'finding', `[${f.severity}] ${f.title}`)
    }

    // Reset failure counter on success.
    cs.failures = 0
    cs.open = false
    io.emit('room:status', { roomId, status: 'done', failures: 0, circuitOpen: false })
    void patchRoom(roomId, { status: 'done', failures: 0, circuitOpen: false })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    cs.failures += 1
    cs.lastFailureAt = Date.now()
    broadcastMemory(roomId, 'event', `agent "${room.llm}" error (${cs.failures}/${CIRCUIT_FAILURE_THRESHOLD}): ${message}`)

    if (cs.failures >= CIRCUIT_FAILURE_THRESHOLD) {
      cs.open = true
      io.emit('room:tripped', { roomId, reason: `${cs.failures} consecutive failures: ${message}` })
      io.emit('room:status', { roomId, status: 'tripped', failures: cs.failures, circuitOpen: true })
      void patchRoom(roomId, { status: 'tripped', failures: cs.failures, circuitOpen: true })
      broadcastMemory(roomId, 'event', `circuit-breaker OPEN for "${room.llm}" — manual reset required`)
    } else {
      io.emit('room:status', { roomId, status: 'error', failures: cs.failures, circuitOpen: cs.open })
      void patchRoom(roomId, { status: 'error', failures: cs.failures, circuitOpen: cs.open })
    }
  } finally {
    cancelTokens.delete(roomId)
    maybeEmitDagMerged()
  }
}

function maybeEmitDagMerged(): void {
  // If no room is currently running, mark the DAG as merged.
  const anyRunning = ROOM_CONFIG.some((r) => {
    const t = cancelTokens.get(r.id)
    return !!t && !t.cancelled
  })
  if (!anyRunning) {
    const allTouched = ROOM_CONFIG.every((r) => {
      const cs = circuit.get(r.id)
      return cs !== undefined
    })
    const phase: DagPhase = allTouched ? 'merged' : io ? 'idle' : 'idle'
    io.emit('dag:update', { phase })
  }
}

async function runAllRooms(): Promise<void> {
  broadcastMemory(null, 'event', `dispatcher: launching ${ROOM_CONFIG.length} agents in parallel`)
  // Parallel DAG — true fan-out.
  await Promise.all(ROOM_CONFIG.map((r) => runRoom(r.id)))
}

function resetRoom(roomId: string): void {
  const token = cancelTokens.get(roomId)
  if (token) token.cancelled = true
  cancelTokens.delete(roomId)
  const cs = circuitOf(roomId)
  cs.failures = 0
  cs.open = false
  cs.lastFailureAt = null
  io.emit('room:status', { roomId, status: 'idle', failures: 0, circuitOpen: false })
  void patchRoom(roomId, { status: 'idle', failures: 0, circuitOpen: false })
  broadcastMemory(roomId, 'event', `room reset — circuit closed, buffers cleared`)
}

/* ----------------------------- socket wiring ----------------------------- */

io.on('connection', (socket) => {
  console.log(`[agent-service] client connected: ${socket.id}`)

  socket.emit('connect_ack', {
    rooms: [],
    memory: [],
    dag: 'idle',
  })

  socket.on('start:room', (payload) => {
    if (!ROOM_BY_ID[payload.roomId]) return
    void runRoom(payload.roomId)
  })

  socket.on('start:all', () => {
    void runAllRooms()
  })

  socket.on('stop:room', (payload) => {
    const token = cancelTokens.get(payload.roomId)
    if (token) token.cancelled = true
  })

  socket.on('reset:room', (payload) => {
    resetRoom(payload.roomId)
  })

  socket.on('disconnect', () => {
    console.log(`[agent-service] client disconnected: ${socket.id}`)
  })
})

/* ----------------------------- boot ----------------------------- */

async function boot(): Promise<void> {
  try {
    zai = await ZAI.create()
    console.log('[agent-service] ZAI SDK initialized')
  } catch (err) {
    console.error('[agent-service] ZAI SDK init failed:', err instanceof Error ? err.message : err)
    // Continue serving — agents will trip their circuits on first run.
  }

  httpServer.listen(PORT, () => {
    console.log(`[agent-service] socket.io listening on port ${PORT} (path "/")`)
  })
}

process.on('SIGTERM', () => {
  console.log('[agent-service] SIGTERM, shutting down')
  io.close()
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  console.log('[agent-service] SIGINT, shutting down')
  io.close()
  httpServer.close(() => process.exit(0))
})

void boot()
