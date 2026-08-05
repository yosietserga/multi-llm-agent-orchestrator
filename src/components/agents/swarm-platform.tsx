'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import {
  Layers, Play, Radio, Wifi, WifiOff, TriangleAlert, Square,
  Workflow, KanbanSquare, BarChart3, MessagesSquare, Sparkles, Plug, Server, FileText,
  Brain, Cpu, ShieldCheck,
} from 'lucide-react'
import { useSwarmStore } from '@/lib/agents/store'
import { useAgentSocket } from '@/lib/agents/use-agent-socket'
import { SKILL_COUNT } from '@/lib/agents/skills'
import { MCP_COUNT } from '@/lib/agents/mcp'
import { LLM_REGISTRY, DEMO_MODEL_ID } from '@/lib/agents/models'
import type { ViewId, SwarmTask, LlmEndpointRow, ReportRow, MemoryEvent } from '@/lib/types'
import { SwarmWorkflowView } from './swarm-workflow-view'
import { KanbanView } from './kanban-view'
import { GanttView } from './gantt-view'
import { ChatRoomsView } from './chat-rooms-view'
import { SkillsView } from './skills-view'
import { McpView } from './mcp-view'
import { EndpointsView } from './endpoints-view'
import { ReportsView } from './reports-view'
import { LlmRegistryPanel } from './llm-registry-panel'

const VIEWS: { id: ViewId; label: string; icon: React.ReactNode }[] = [
  { id: 'swarm', label: 'Swarm', icon: <Workflow className="h-3.5 w-3.5" /> },
  { id: 'kanban', label: 'Kanban', icon: <KanbanSquare className="h-3.5 w-3.5" /> },
  { id: 'gantt', label: 'Gantt', icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: 'chat', label: 'Chat Rooms', icon: <MessagesSquare className="h-3.5 w-3.5" /> },
  { id: 'skills', label: 'Skills', icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: 'mcp', label: 'MCP', icon: <Plug className="h-3.5 w-3.5" /> },
  { id: 'endpoints', label: 'Endpoints', icon: <Server className="h-3.5 w-3.5" /> },
  { id: 'reports', label: 'Reports', icon: <FileText className="h-3.5 w-3.5" /> },
]

const DEFAULT_DEMO_GOAL = 'Audit the Multi-LLM Agent Swarm Platform for production readiness: architecture, security, feature completeness, and UX.'

export function SwarmPlatform() {
  const socket = useAgentSocket()
  const view = useSwarmStore((s) => s.view)
  const setView = useSwarmStore((s) => s.setView)
  const connected = useSwarmStore((s) => s.connected)
  const dag = useSwarmStore((s) => s.dag)
  const lastError = useSwarmStore((s) => s.lastError)
  const setLastError = useSwarmStore((s) => s.setLastError)
  const demoRunning = useSwarmStore((s) => s.demoRunning)
  const hydrateFromApi = useSwarmStore((s) => s.hydrateFromApi)
  const pushMemory = useSwarmStore((s) => s.pushMemory)
  const memory = useSwarmStore((s) => s.memory)

  const [hydrating, setHydrating] = useState(true)
  const [demoGoal, setDemoGoal] = useState(DEFAULT_DEMO_GOAL)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await fetch('/api/seed', { method: 'POST' })
        const [roomsRes, memRes, tasksRes, endpointsRes, reportsRes] = await Promise.all([
          fetch('/api/rooms'),
          fetch('/api/memory'),
          fetch('/api/tasks'),
          fetch('/api/endpoints'),
          fetch('/api/reports'),
        ])
        const roomsJson = await roomsRes.json()
        const memJson = await memRes.json()
        const tasksJson = await tasksRes.json()
        const endpointsJson = await endpointsRes.json()
        const reportsJson = await reportsRes.json()
        if (cancelled) return
        hydrateFromApi(
          Array.isArray(roomsJson.rooms) ? roomsJson.rooms : [],
          Array.isArray(tasksJson.tasks) ? (tasksJson.tasks as SwarmTask[]) : undefined,
          Array.isArray(endpointsJson.endpoints) ? (endpointsJson.endpoints as LlmEndpointRow[]) : undefined,
          Array.isArray(reportsJson.reports) ? (reportsJson.reports as ReportRow[]) : undefined,
        )
        if (Array.isArray(memJson.memory)) {
          memJson.memory.reverse().forEach((e: MemoryEvent) => pushMemory(e))
        }
      } catch (err) {
        setLastError(err instanceof Error ? err.message : 'hydrate failed')
      } finally {
        if (!cancelled) setHydrating(false)
      }
    })()
    return () => { cancelled = true }
  }, [hydrateFromApi, pushMemory, setLastError])

  const launchDemo = useCallback(() => {
    socket.launchDemo(demoGoal)
  }, [socket, demoGoal])

  const stopDemo = useCallback(() => socket.stopDemo(), [socket])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Layers className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-base font-semibold leading-tight">Agent Swarm Platform</h1>
              <p className="text-[11px] text-muted-foreground">
                {LLM_REGISTRY.length} LLMs · {SKILL_COUNT} skills · {MCP_COUNT} MCP connectors · 8 views
              </p>
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
            <Badge variant="secondary" className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              demo: {DEMO_MODEL_ID}
            </Badge>
          </div>
        </div>

        {/* View switcher */}
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                view === v.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {v.icon}
              {v.label}
            </button>
          ))}
        </div>

        {/* Demo launcher */}
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 border-t px-4 py-2 sm:px-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Self-demo (GLM-only):</span>
          <Input
            value={demoGoal}
            onChange={(e) => setDemoGoal(e.target.value)}
            disabled={demoRunning}
            className="h-8 flex-1 min-w-[200px] font-mono text-xs"
            placeholder="main goal — all agents align to this"
          />
          {demoRunning ? (
            <Button size="sm" variant="destructive" onClick={stopDemo} className="gap-1.5 h-8">
              <Square className="h-3.5 w-3.5" /> Stop demo
            </Button>
          ) : (
            <Button size="sm" onClick={launchDemo} disabled={!connected || hydrating} className="gap-1.5 h-8">
              <Play className="h-3.5 w-3.5" /> Launch orchestrated demo
            </Button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6">
        {lastError && (
          <Alert variant="destructive" className="mb-4">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Platform notice</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-2">
              <span>{lastError}</span>
              <Button size="sm" variant="outline" onClick={() => setLastError(null)}>dismiss</Button>
            </AlertDescription>
          </Alert>
        )}

        {view === 'swarm' && (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <SwarmWorkflowView />
            <div className="space-y-4">
              <MemoryPanel />
              <LlmRegistryPanel />
            </div>
          </div>
        )}
        {view === 'kanban' && <KanbanView />}
        {view === 'gantt' && <GanttView />}
        {view === 'chat' && (
          <ChatRoomsView connected={connected} onRun={socket.startRoom} onStop={socket.stopRoom} onReset={socket.resetRoom} />
        )}
        {view === 'skills' && <SkillsView />}
        {view === 'mcp' && <McpView />}
        {view === 'endpoints' && <EndpointsView />}
        {view === 'reports' && <ReportsView />}

        {/* Stats footer ribbon */}
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<Sparkles className="h-4 w-4" />} label="Skills" value={SKILL_COUNT} sub="9 categories" />
          <StatCard icon={<Plug className="h-4 w-4" />} label="MCP connectors" value={MCP_COUNT} sub="built-in" />
          <StatCard icon={<Cpu className="h-4 w-4" />} label="LLM models" value={LLM_REGISTRY.length} sub="incl. DeepSeek" />
          <StatCard icon={<ShieldCheck className="h-4 w-4" />} label="Patterns" value={9} sub="research patterns" />
        </section>
      </main>

      {/* Sticky footer */}
      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground sm:px-6">
          <span>Agent Swarm Platform · socket.io :3003 · Next.js 16 · z-ai-web-dev-sdk (GLM)</span>
          <span>100 skills · 10 MCP · 6 LLMs · Zod typed contracts · Two-Phase Commit</span>
        </div>
      </footer>
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</span>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-semibold tabular-nums">{value}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}

function MemoryPanel() {
  const memory = useSwarmStore((s) => s.memory)
  const tasks = useSwarmStore((s) => s.tasks)
  const roomTitle = (id: string | null) => (id ? 'task' : 'shared')
  const findings = memory.filter((m) => m.kind === 'finding')

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Brain className="h-4 w-4" />
        <span className="text-sm font-semibold">Shared Episodic Memory</span>
        <Badge variant="secondary" className="ml-auto">{memory.length}</Badge>
      </div>
      <div className="max-h-64 overflow-y-auto p-2" style={{ scrollbarWidth: 'thin' }}>
        {memory.length === 0 ? (
          <p className="py-6 text-center text-xs italic text-muted-foreground">No events. Run agents or launch the demo.</p>
        ) : (
          <ol className="space-y-1.5">
            {memory.slice(0, 30).map((e) => (
              <li key={e.id} className="rounded border-l-2 border-primary/40 bg-muted/30 px-2 py-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium uppercase text-[9px] text-muted-foreground">{e.kind}</span>
                  <span className="text-[9px] text-muted-foreground">{roomTitle(e.roomId)}</span>
                  <span className="ml-auto text-[9px] text-muted-foreground tabular-nums">{new Date(e.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="mt-0.5 text-foreground/85">{e.content}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
