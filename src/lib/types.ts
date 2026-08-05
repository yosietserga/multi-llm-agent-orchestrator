/**
 * Shared wire types for the agent swarm platform.
 */
import type { LlmModelSpec } from './agents/models'
import type { Skill } from './agents/skills'
import type { McpConnector } from './agents/mcp'

export type RoomStatus = 'idle' | 'running' | 'done' | 'tripped' | 'error'
export type TaskStatus = 'backlog' | 'queued' | 'running' | 'done' | 'blocked' | 'tripped'
export type TaskKind = 'orchestrator' | 'agent' | 'subagent'
export type DagPhase = 'idle' | 'running' | 'merged'
export type ViewId = 'swarm' | 'kanban' | 'gantt' | 'chat' | 'skills' | 'mcp' | 'endpoints' | 'reports'

export interface ModelSpec {
  provider: string
  model: string
  version: string
  vendor: string
}

export interface Finding {
  id: string
  roomId: string
  taskId?: string | null
  severity: 'info' | 'warn' | 'critical'
  title: string
  detail: string
  validated: boolean
  provider?: string | null
  model?: string | null
  modelVersion?: string | null
  createdAt: string
}

export interface MemoryEvent {
  id: string
  roomId: string | null
  taskId?: string | null
  kind: 'event' | 'finding' | 'decision'
  content: string
  createdAt: string
}

export interface LiveRoom {
  id: string
  llm: string
  topic: string
  title: string
  status: RoomStatus
  systemPrompt: string
  taskPrompt: string
  allowedTools: string[]
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

export interface SwarmTask {
  id: string
  parentId: string | null
  roomId: string | null
  title: string
  goal: string
  status: TaskStatus
  kind: TaskKind
  model: ModelSpec
  mainGoal: string | null
  result: string | null
  summary: string | null
  column: string
  priority: number
  depth: number
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  durationMs: number | null
  children: SwarmTask[]
}

export interface LlmEndpointRow {
  id: string
  name: string
  provider: string
  baseUrl: string
  model: string
  active: boolean
  createdAt: string
}

export interface ReportRow {
  id: string
  title: string
  mainGoal: string
  body: string
  provider: string
  models: ModelSpec[]
  taskCount: number
  findingCount: number
  createdAt: string
}

export interface SwarmState {
  tasks: SwarmTask[]
  rooms: LiveRoom[]
  memory: MemoryEvent[]
  endpoints: LlmEndpointRow[]
  reports: ReportRow[]
  dag: DagPhase
}

/* ---- Socket events: server -> client ---- */
export interface ServerToClientEvents {
  connect_ack: (payload: { dag: DagPhase }) => void
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
  'task:upsert': (payload: { task: SwarmTask }) => void
  'task:stream': (payload: { taskId: string; chunk: string; done: boolean }) => void
  'task:finding': (payload: { taskId: string; finding: Finding; phase: 'committed' | 'rejected'; reason?: string }) => void
  'report:new': (payload: { report: ReportRow }) => void
}

/* ---- Socket events: client -> server ---- */
export interface ClientToServerEvents {
  'start:room': (payload: { roomId: string }) => void
  'start:all': () => void
  'stop:room': (payload: { roomId: string }) => void
  'reset:room': (payload: { roomId: string }) => void
  'demo:launch': (payload: { mainGoal: string }) => void
  'demo:stop': () => void
}

export type { LlmModelSpec, Skill, McpConnector }
