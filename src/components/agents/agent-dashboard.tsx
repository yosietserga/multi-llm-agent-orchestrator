'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Play, Radio, Layers, TriangleAlert, Wifi, WifiOff } from 'lucide-react'
import { useAgentStore } from '@/lib/agents/store'
import { useAgentSocket } from '@/lib/agents/use-agent-socket'
import { AgentRoomCard } from './agent-room-card'
import { MemoryTimeline } from './memory-timeline'
import { DagVisualizer } from './dag-visualizer'
import { SchemaInspector } from './schema-inspector'
import { ToolScopeMatrix } from './tool-scope-matrix'
import { FindingsTable } from './findings-table'

export function AgentDashboard() {
  const socket = useAgentSocket()
  const rooms = useAgentStore((s) => s.rooms)
  const connected = useAgentStore((s) => s.connected)
  const dag = useAgentStore((s) => s.dag)
  const lastError = useAgentStore((s) => s.lastError)
  const selectedRoomId = useAgentStore((s) => s.selectedRoomId)
  const hydrateFromApi = useAgentStore((s) => s.hydrateFromApi)
  const pushMemory = useAgentStore((s) => s.pushMemory)
  const setSelected = useAgentStore((s) => s.setSelected)
  const setLastError = useAgentStore((s) => s.setLastError)

  const [hydrating, setHydrating] = useState(true)

  // Hydrate persisted state from the API on mount.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Ensure rooms are seeded (idempotent).
        await fetch('/api/seed', { method: 'POST' })
        const [roomsRes, memRes] = await Promise.all([fetch('/api/rooms'), fetch('/api/memory')])
        const roomsJson = await roomsRes.json()
        const memJson = await memRes.json()
        if (cancelled) return
        if (Array.isArray(roomsJson.rooms)) hydrateFromApi(roomsJson.rooms)
        if (Array.isArray(memJson.memory)) {
          // Push newest-last so the store's prepend keeps order correct.
          memJson.memory.reverse().forEach((e: never) => pushMemory(e as never))
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'hydrate failed'
        setLastError(message)
      } finally {
        if (!cancelled) setHydrating(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hydrateFromApi, pushMemory, setLastError])

  const runningCount = rooms.filter((r) => r.status === 'running').length
  const doneCount = rooms.filter((r) => r.status === 'done').length
  const trippedCount = rooms.filter((r) => r.status === 'tripped' || r.status === 'error').length

  const handleRunAll = useCallback(() => {
    socket.startAll()
  }, [socket])

  const handleRun = useCallback((id: string) => socket.startRoom(id), [socket])
  const handleStop = useCallback((id: string) => socket.stopRoom(id), [socket])
  const handleReset = useCallback((id: string) => socket.resetRoom(id), [socket])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Layers className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Multi-LLM Agent Orchestrator</h1>
              <p className="text-xs text-muted-foreground">parallel chat-rooms · typed contracts · circuit-breakers</p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5">
              {connected ? <Wifi className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3 text-muted-foreground" />}
              {connected ? 'socket live' : 'socket off'}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Radio className="h-3 w-3" /> DAG: {dag}
            </Badge>
            <Button onClick={handleRunAll} disabled={!connected || runningCount > 0} className="gap-1.5">
              <Play className="h-4 w-4" /> Run all in parallel
            </Button>
          </div>
        </div>

        {/* Status strip */}
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 pb-2.5 text-xs sm:px-6">
          <span className="text-muted-foreground">rooms:</span>
          <Badge variant="secondary" className="bg-sky-500/15 text-sky-700 dark:text-sky-300">{runningCount} running</Badge>
          <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">{doneCount} done</Badge>
          <Badge variant="secondary" className="bg-red-500/15 text-red-700 dark:text-red-300">{trippedCount} tripped</Badge>
          <span className="ml-auto text-muted-foreground">
            case study: Qwen → widgets · GLM → security · Claude → admin-app (parallel, no collisions)
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {lastError && (
          <Alert variant="destructive" className="mb-4">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Orchestrator notice</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-2">
              <span>{lastError}</span>
              <Button size="sm" variant="outline" onClick={() => setLastError(null)}>dismiss</Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Room grid (the parallel "chat rooms") */}
        <section aria-label="agent rooms" className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Agent Chat Rooms</h2>
            {hydrating && <Badge variant="outline" className="text-[10px]">hydrating…</Badge>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <AgentRoomCard
                key={room.id}
                room={room}
                connected={connected}
                onRun={handleRun}
                onStop={handleStop}
                onReset={handleReset}
                onSelect={setSelected}
                selected={selectedRoomId === room.id}
              />
            ))}
          </div>
        </section>

        {/* Panels grid */}
        <section aria-label="orchestration panels" className="grid gap-4 lg:grid-cols-3">
          <DagVisualizer />
          <ToolScopeMatrix />
          <SchemaInspector />
        </section>

        <section aria-label="memory and findings" className="mt-4 grid gap-4 lg:grid-cols-2">
          <MemoryTimeline />
          <FindingsTable />
        </section>

        {/* Killer features legend — maps each panel to a Round 52 research pattern */}
        <section className="mt-6 rounded-lg border bg-muted/30 p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            10 Killer Features · 9 Research Patterns
          </h2>
          <div className="grid gap-x-6 gap-y-1.5 text-xs text-muted-foreground sm:grid-cols-2">
            <span>① Parallel agent grid — live, collision-free</span>
            <span>⑥ DAG dependency visualizer</span>
            <span>② Per-room streaming chat</span>
            <span>⑦ Schema contract inspector</span>
            <span>③ Shared episodic memory timeline</span>
            <span>⑧ Tool-scope matrix (least-privilege)</span>
            <span>④ Circuit-breaker status panel</span>
            <span>⑨ Two-phase commit (validate→persist)</span>
            <span>⑤ Findings index (root report)</span>
            <span>⑩ Run-all-in-parallel dispatcher</span>
          </div>
        </section>
      </main>

      {/* Sticky footer */}
      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground sm:px-6">
          <span>Multi-LLM Agent Orchestrator · socket.io :3003 · Next.js 16</span>
          <span>z-ai-web-dev-sdk · Prisma SQLite · Zod typed contracts</span>
        </div>
      </footer>
    </div>
  )
}
