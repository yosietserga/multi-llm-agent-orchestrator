'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Workflow, Play, CircleDot, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react'
import { useSwarmStore, flattenTasks } from '@/lib/agents/store'
import type { SwarmTask, TaskStatus } from '@/lib/types'

const KIND_META: Record<string, { color: string; label: string }> = {
  orchestrator: { color: '#6366f1', label: 'orchestrator' },
  agent: { color: '#0ea5e9', label: 'agent' },
  subagent: { color: '#10b981', label: 'subagent' },
}

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  backlog: <CircleDot className="h-3 w-3 text-muted-foreground" />,
  queued: <CircleDot className="h-3 w-3 text-sky-500" />,
  running: <Loader2 className="h-3 w-3 animate-spin text-sky-500" />,
  done: <CheckCircle2 className="h-3 w-3 text-emerald-500" />,
  blocked: <ShieldAlert className="h-3 w-3 text-amber-500" />,
  tripped: <ShieldAlert className="h-3 w-3 text-red-500" />,
}

/** Layout: orchestrator at top, agents in a row beneath, subagents beneath each. */
function layoutTree(tasks: SwarmTask[]) {
  const orchestrator = tasks.find((t) => t.kind === 'orchestrator') ?? tasks[0]
  const agents = orchestrator?.children ?? tasks.filter((t) => t.kind === 'agent')
  const nodes: { task: SwarmTask; x: number; y: number }[] = []
  const edges: { from: string; to: string; active: boolean }[] = []

  const cx = 360
  if (orchestrator) {
    nodes.push({ task: orchestrator, x: cx, y: 40 })
  }
  const agentCount = agents.length
  agents.forEach((a, i) => {
    const x = agentCount > 1 ? 120 + (i * 480) / (agentCount - 1) : cx
    const y = 170
    nodes.push({ task: a, x, y })
    if (orchestrator) edges.push({ from: orchestrator.id, to: a.id, active: a.status === 'running' })
    a.children?.forEach((s, j) => {
      const sx = x + (j === 0 ? -50 : 50)
      nodes.push({ task: s, x: sx, y: 300 })
      edges.push({ from: a.id, to: s.id, active: s.status === 'running' })
    })
  })
  return { nodes, edges }
}

export function SwarmWorkflowView() {
  const tasks = useSwarmStore((s) => s.tasks)
  const dag = useSwarmStore((s) => s.dag)
  const setSelectedTask = useSwarmStore((s) => s.setSelectedTask)

  const flat = useMemo(() => flattenTasks(tasks), [tasks])
  const { nodes, edges } = useMemo(() => layoutTree(tasks), [tasks])

  const running = flat.filter((t) => t.status === 'running').length
  const done = flat.filter((t) => t.status === 'done').length

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Workflow className="h-4 w-4" /> Swarm Workflow
          <Badge variant="outline" className="ml-auto gap-1">
            {STATUS_ICON.running}
            <span className="tabular-nums">{running} running</span>
          </Badge>
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            <span className="tabular-nums">{done} done</span>
          </Badge>
          <Badge variant="secondary" className={dag === 'running' ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300' : dag === 'merged' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : ''}>
            DAG: {dag}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {flat.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
            <Workflow className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No swarm tasks yet.</p>
            <p className="text-xs text-muted-foreground">Launch the self-demo (GLM-only) from the header to dispatch an orchestrator + parallel agents + subagents.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <svg viewBox="0 0 720 380" className="h-[380px] w-full min-w-[640px]" role="img" aria-label="swarm workflow DAG">
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L7,3 L0,6 Z" fill="#94a3b8" />
                </marker>
                <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L7,3 L0,6 Z" fill="#0ea5e9" />
                </marker>
              </defs>
              {/* edges */}
              {edges.map((e, i) => {
                const from = nodes.find((n) => n.task.id === e.from)
                const to = nodes.find((n) => n.task.id === e.to)
                if (!from || !to) return null
                const midY = (from.y + to.y) / 2
                return (
                  <path
                    key={`edge-${i}`}
                    d={`M ${from.x} ${from.y + 28} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y - 28}`}
                    fill="none"
                    stroke={e.active ? '#0ea5e9' : '#cbd5e1'}
                    strokeWidth={e.active ? 2.5 : 1.5}
                    strokeDasharray={e.active ? '6 4' : 'none'}
                    markerEnd={`url(#${e.active ? 'arrow-active' : 'arrow'})`}
                    className={e.active ? 'animate-pulse' : ''}
                  >
                    {e.active && (
                      <animate attributeName="stroke-dashoffset" from="10" to="0" dur="0.6s" repeatCount="indefinite" />
                    )}
                  </path>
                )
              })}
              {/* nodes */}
              {nodes.map(({ task, x, y }) => {
                const meta = KIND_META[task.kind] ?? KIND_META.agent
                const w = 160
                const h = 56
                return (
                  <TooltipProvider key={task.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <g
                          transform={`translate(${x - w / 2}, ${y - h / 2})`}
                          className="cursor-pointer"
                          onClick={() => setSelectedTask(task.id)}
                        >
                          <rect
                            width={w}
                            height={h}
                            rx={10}
                            fill={meta.color}
                            opacity={task.status === 'done' ? 0.65 : 0.92}
                            stroke={task.status === 'running' ? '#0ea5e9' : 'none'}
                            strokeWidth={task.status === 'running' ? 2 : 0}
                          />
                          <text x={w / 2} y={18} textAnchor="middle" className="fill-white text-[10px] font-semibold uppercase">
                            {meta.label}
                          </text>
                          <text x={w / 2} y={34} textAnchor="middle" className="fill-white text-[11px] font-medium">
                            {task.title.slice(0, 22)}
                          </text>
                          <text x={w / 2} y={48} textAnchor="middle" className="fill-white/80 text-[9px]">
                            {task.model.provider}/{task.model.model}
                          </text>
                          {/* status dot */}
                          <circle cx={w - 12} cy={12} r={5} fill={task.status === 'done' ? '#10b981' : task.status === 'running' ? '#0ea5e9' : '#fbbf24'} />
                        </g>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-1 text-xs">
                          <p className="font-semibold">{task.title}</p>
                          <p className="text-muted-foreground">{task.goal.slice(0, 120)}</p>
                          <p className="font-mono text-[10px]">{task.model.provider}/{task.model.model}@{task.model.version}</p>
                          <p>status: {task.status} · depth: {task.depth}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
            </svg>
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> orchestrator</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> agent</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> subagent</span>
          <span className="flex items-center gap-1"><Play className="h-3 w-3 text-sky-500" /> animated edge = active data flow</span>
        </div>
      </CardContent>
    </Card>
  )
}
