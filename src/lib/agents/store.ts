'use client'

import { create } from 'zustand'
import { ROOM_CONFIG } from './config'
import { LLM_BY_ID, DEMO_MODEL_ID } from './models'
import type {
  LiveRoom,
  MemoryEvent,
  Finding,
  RoomStatus,
  DagPhase,
  SwarmTask,
  LlmEndpointRow,
  ReportRow,
  ViewId,
  TaskStatus,
  ModelSpec,
} from '../types'

const DEMO_MODEL = LLM_BY_ID[DEMO_MODEL_ID]
export const DEMO_MODEL_SPEC: ModelSpec = {
  provider: DEMO_MODEL.provider,
  model: DEMO_MODEL.id,
  version: DEMO_MODEL.version,
  vendor: DEMO_MODEL.vendor,
}

interface SwarmStateStore {
  /* view */
  view: ViewId
  setView: (v: ViewId) => void

  /* data */
  rooms: LiveRoom[]
  tasks: SwarmTask[]
  memory: MemoryEvent[]
  endpoints: LlmEndpointRow[]
  reports: ReportRow[]
  dag: DagPhase
  connected: boolean
  selectedRoomId: string | null
  selectedTaskId: string | null
  lastError: string | null
  demoRunning: boolean
  demoMainGoal: string | null
  user: { email: string; name: string; role: string } | null

  /* setters */
  setUser: (u: { email: string; name: string; role: string } | null) => void
  setConnected: (v: boolean) => void
  setSelectedRoom: (id: string | null) => void
  setSelectedTask: (id: string | null) => void
  setLastError: (e: string | null) => void
  setDag: (phase: DagPhase) => void
  setDemoRunning: (v: boolean, goal?: string | null) => void
  setEndpoints: (e: LlmEndpointRow[]) => void
  setReports: (r: ReportRow[]) => void
  setTasks: (t: SwarmTask[]) => void

  /* live mutations */
  hydrateFromApi: (rooms: Array<Record<string, unknown>>, tasks?: SwarmTask[], endpoints?: LlmEndpointRow[], reports?: ReportRow[]) => void
  applyStatus: (roomId: string, status: RoomStatus, failures?: number, circuitOpen?: boolean) => void
  appendStream: (roomId: string, chunk: string) => void
  finishStream: (roomId: string) => void
  setSummary: (roomId: string, summary: string) => void
  upsertFinding: (roomId: string, finding: Finding) => void
  pushMemory: (event: MemoryEvent) => void
  upsertTask: (task: SwarmTask) => void
  appendTaskStream: (taskId: string, chunk: string) => void
  upsertTaskFinding: (taskId: string, finding: Finding) => void
  pushReport: (report: ReportRow) => void
  resetRoom: (roomId: string) => void
}

function initialRooms(): LiveRoom[] {
  return ROOM_CONFIG.map((c) => ({
    id: c.id,
    llm: c.llm,
    topic: c.topic,
    title: c.title,
    status: 'idle' as RoomStatus,
    systemPrompt: c.systemPrompt,
    taskPrompt: c.taskPrompt,
    allowedTools: c.allowedTools,
    contract: c.contract,
    accent: c.accent,
    streamBuffer: '',
    summary: null,
    findings: [],
    failures: 0,
    circuitOpen: false,
    startedAt: null,
    finishedAt: null,
  }))
}

/** Flatten a task tree into a list (for kanban/gantt). */
export function flattenTasks(tasks: SwarmTask[]): SwarmTask[] {
  const out: SwarmTask[] = []
  const walk = (list: SwarmTask[]) => {
    for (const t of list) {
      out.push(t)
      if (t.children?.length) walk(t.children)
    }
  }
  walk(tasks)
  return out
}

export const useSwarmStore = create<SwarmStateStore>((set) => ({
  view: 'swarm',
  setView: (v) => set({ view: v }),

  rooms: initialRooms(),
  tasks: [],
  memory: [],
  endpoints: [],
  reports: [],
  dag: 'idle',
  connected: false,
  selectedRoomId: ROOM_CONFIG[0]?.id ?? null,
  selectedTaskId: null,
  lastError: null,
  demoRunning: false,
  demoMainGoal: null,
  user: null,

  setUser: (u) => set({ user: u }),

  setConnected: (v) => set({ connected: v }),
  setSelectedRoom: (id) => set({ selectedRoomId: id }),
  setSelectedTask: (id) => set({ selectedTaskId: id }),
  setLastError: (e) => set({ lastError: e }),
  setDag: (phase) => set({ dag: phase }),
  setDemoRunning: (v, goal) => set({ demoRunning: v, demoMainGoal: goal ?? null }),
  setEndpoints: (e) => set({ endpoints: e }),
  setReports: (r) => set({ reports: r }),
  setTasks: (t) => set({ tasks: t }),

  hydrateFromApi: (apiRooms, tasks, endpoints, reports) =>
    set((state) => {
      const persisted = new Map(apiRooms.map((r) => [String(r.id), r]))
      const rooms = state.rooms.map((room) => {
        const p = persisted.get(room.id)
        if (!p) return room
        return {
          ...room,
          status: (p.status as RoomStatus) ?? room.status,
          failures: (p.failures as number) ?? room.failures,
          circuitOpen: (p.circuitOpen as boolean) ?? room.circuitOpen,
        }
      })
      return {
        rooms,
        ...(tasks ? { tasks } : {}),
        ...(endpoints ? { endpoints } : {}),
        ...(reports ? { reports } : {}),
      }
    }),

  applyStatus: (roomId, status, failures, circuitOpen) =>
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              status,
              failures: failures ?? r.failures,
              circuitOpen: circuitOpen ?? r.circuitOpen,
              startedAt: status === 'running' ? r.startedAt ?? Date.now() : r.startedAt,
              finishedAt: status === 'done' || status === 'tripped' || status === 'error' ? Date.now() : r.finishedAt,
            }
          : r,
      ),
    })),

  appendStream: (roomId, chunk) =>
    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, streamBuffer: r.streamBuffer + chunk } : r)),
    })),

  finishStream: (roomId) =>
    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, status: 'done', finishedAt: Date.now() } : r)),
    })),

  setSummary: (roomId, summary) =>
    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, summary } : r)),
    })),

  upsertFinding: (roomId, finding) =>
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              findings: r.findings.some((f) => f.id === finding.id)
                ? r.findings.map((f) => (f.id === finding.id ? finding : f))
                : [...r.findings, finding],
            }
          : r,
      ),
    })),

  pushMemory: (event) =>
    set((state) => ({ memory: [event, ...state.memory].slice(0, 300) })),

  upsertTask: (task) =>
    set((state) => {
      const flat = flattenTasks(state.tasks)
      const exists = flat.some((t) => t.id === task.id)
      let tasks: SwarmTask[]
      if (exists) {
        // Replace in place (preserve tree structure by updating the matching node).
        const replace = (list: SwarmTask[]): SwarmTask[] =>
          list.map((t) => {
            if (t.id === task.id) return { ...task, children: task.children?.length ? task.children : t.children }
            if (t.children?.length) return { ...t, children: replace(t.children) }
            return t
          })
        tasks = replace(state.tasks)
      } else if (task.parentId) {
        // Insert as child of parent.
        const insert = (list: SwarmTask[]): SwarmTask[] =>
          list.map((t) => {
            if (t.id === task.parentId) return { ...t, children: [...(t.children ?? []), task] }
            if (t.children?.length) return { ...t, children: insert(t.children) }
            return t
          })
        tasks = insert(state.tasks)
      } else {
        tasks = [...state.tasks, task]
      }
      return { tasks }
    }),

  appendTaskStream: (taskId, chunk) =>
    set((state) => {
      const update = (list: SwarmTask[]): SwarmTask[] =>
        list.map((t) => {
          if (t.id === taskId) return { ...t, result: (t.result ?? '') + chunk }
          if (t.children?.length) return { ...t, children: update(t.children) }
          return t
        })
      return { tasks: update(state.tasks) }
    }),

  upsertTaskFinding: (taskId, finding) =>
    set((state) => {
      // Attach finding to the task via memory (findings live on rooms in the
      // legacy model; for tasks we surface them through the report + memory).
      const event: MemoryEvent = {
        id: `mem-${finding.id}`,
        roomId: finding.roomId ?? null,
        taskId,
        kind: 'finding',
        content: `[${finding.severity}] ${finding.title} — ${finding.detail}`,
        createdAt: finding.createdAt,
      }
      return { memory: [event, ...state.memory].slice(0, 300) }
    }),

  pushReport: (report) =>
    set((state) => ({ reports: [report, ...state.reports].slice(0, 50) })),

  resetRoom: (roomId) =>
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId
          ? { ...r, status: 'idle', streamBuffer: '', summary: null, findings: [], failures: 0, circuitOpen: false, startedAt: null, finishedAt: null }
          : r,
      ),
    })),
}))

export function useRoom(roomId: string | null): LiveRoom | undefined {
  return useSwarmStore((s) => s.rooms.find((r) => r.id === roomId))
}

export const TASK_COLUMNS: { id: string; label: string; status: TaskStatus }[] = [
  { id: 'backlog', label: 'Backlog', status: 'backlog' },
  { id: 'queued', label: 'Queued', status: 'queued' },
  { id: 'running', label: 'Running', status: 'running' },
  { id: 'done', label: 'Done', status: 'done' },
  { id: 'blocked', label: 'Blocked', status: 'blocked' },
]
