/**
 * Shared wire types for the agent orchestration pipeline.
 * Used by the Next.js frontend, the API routes, and the agent-service mini-service.
 */
import type { LlmPersona, RoomStatus, ToolName } from './agents/config'

export interface Finding {
  id: string
  roomId: string
  severity: 'info' | 'warn' | 'critical'
  title: string
  detail: string
  validated: boolean
  createdAt: string
}

export interface MemoryEvent {
  id: string
  roomId: string | null
  kind: 'event' | 'finding' | 'decision'
  content: string
  createdAt: string
}

export interface LiveRoom {
  id: string
  llm: LlmPersona
  topic: string
  title: string
  status: RoomStatus
  systemPrompt: string
  taskPrompt: string
  allowedTools: ToolName[]
  contract: string
  accent: string
  streamBuffer: string
  summary: string | null
  findings: Finding[]
  failures: number
  circuitOpen: boolean
  startedAt: number | null
  finishedAt: number | null
}

export type DagPhase = 'idle' | 'running' | 'merged'

/* ---- Socket events: server -> client ---- */
export interface ServerToClientEvents {
  connect_ack: (payload: { rooms: LiveRoom[]; memory: MemoryEvent[]; dag: DagPhase }) => void
  'room:status': (payload: { roomId: string; status: RoomStatus; failures?: number; circuitOpen?: boolean }) => void
  'room:stream': (payload: { roomId: string; chunk: string; done: boolean }) => void
  'room:summary': (payload: { roomId: string; summary: string }) => void
  'room:finding': (payload: {
    roomId: string
    finding: Finding
    phase: 'pre-commit' | 'committed' | 'rejected'
    reason?: string
  }) => void
  'room:tripped': (payload: { roomId: string; reason: string }) => void
  'memory:event': (payload: { event: MemoryEvent }) => void
  'dag:update': (payload: { phase: DagPhase }) => void
}

/* ---- Socket events: client -> server ---- */
export interface ClientToServerEvents {
  'start:room': (payload: { roomId: string }) => void
  'start:all': () => void
  'stop:room': (payload: { roomId: string }) => void
  'reset:room': (payload: { roomId: string }) => void
}
