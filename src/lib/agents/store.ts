'use client'

import { create } from 'zustand'
import { ROOM_CONFIG } from './config'
import type { LiveRoom, MemoryEvent, Finding, RoomStatus, DagPhase } from '../types'

interface AgentState {
  rooms: LiveRoom[]
  memory: MemoryEvent[]
  dag: DagPhase
  connected: boolean
  selectedRoomId: string | null
  lastError: string | null

  hydrateFromApi: (rooms: Array<Record<string, unknown>>) => void
  setConnected: (v: boolean) => void
  setSelected: (id: string | null) => void
  setLastError: (e: string | null) => void

  applyStatus: (roomId: string, status: RoomStatus, failures?: number, circuitOpen?: boolean) => void
  appendStream: (roomId: string, chunk: string) => void
  finishStream: (roomId: string) => void
  setSummary: (roomId: string, summary: string) => void
  upsertFinding: (roomId: string, finding: Finding) => void
  pushMemory: (event: MemoryEvent) => void
  setDag: (phase: DagPhase) => void
  resetRoom: (roomId: string) => void
  runAllOptimistic: () => void
}

/** Build the initial live room shape from ROOM_CONFIG (renders before API hydrates). */
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

export const useAgentStore = create<AgentState>((set, get) => ({
  rooms: initialRooms(),
  memory: [],
  dag: 'idle',
  connected: false,
  selectedRoomId: ROOM_CONFIG[0]?.id ?? null,
  lastError: null,

  hydrateFromApi: (apiRooms) =>
    set((state) => {
      // Merge persisted status into the live rooms (keep live buffers intact).
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
      return { rooms }
    }),

  setConnected: (v) => set({ connected: v }),
  setSelected: (id) => set({ selectedRoomId: id }),
  setLastError: (e) => set({ lastError: e }),

  applyStatus: (roomId, status, failures, circuitOpen) =>
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              status,
              failures: failures ?? r.failures,
              circuitOpen: circuitOpen ?? r.circuitOpen,
              startedAt: status === 'running' ? (r.startedAt ?? Date.now()) : r.startedAt,
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
    set((state) => ({ memory: [event, ...state.memory].slice(0, 200) })),

  setDag: (phase) => set({ dag: phase }),

  resetRoom: (roomId) =>
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId
          ? { ...r, status: 'idle', streamBuffer: '', summary: null, findings: [], failures: 0, circuitOpen: false, startedAt: null, finishedAt: null }
          : r,
      ),
    })),

  runAllOptimistic: () =>
    set((state) => ({
      dag: 'running',
      rooms: state.rooms.map((r) =>
        r.circuitOpen ? r : { ...r, status: r.status === 'running' ? r.status : 'idle' },
      ),
    })),
}))

/** Convenience selector hook. */
export function useRoom(roomId: string | null): LiveRoom | undefined {
  return useAgentStore((s) => s.rooms.find((r) => r.id === roomId))
}
