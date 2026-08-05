'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GitBranch } from 'lucide-react'
import { useAgentStore } from '@/lib/agents/store'

/**
 * Parallel DAG visualizer — three agents fan out from the dispatcher and merge
 * into a single "findings index". Realizes the Parallel DAG research pattern.
 */
export function DagVisualizer() {
  const rooms = useAgentStore((s) => s.rooms)
  const dag = useAgentStore((s) => s.dag)

  const anyRunning = rooms.some((r) => r.status === 'running')
  const allDone = rooms.every((r) => r.status === 'done' || r.circuitOpen)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="h-4 w-4" /> Parallel DAG
          <Badge
            variant="secondary"
            className={
              dag === 'running'
                ? 'ml-auto bg-sky-500/15 text-sky-700 dark:text-sky-300'
                : dag === 'merged'
                  ? 'ml-auto bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'ml-auto bg-muted text-muted-foreground'
            }
          >
            {dag}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox="0 0 520 220" className="h-[200px] w-full" role="img" aria-label="parallel agent DAG">
          {/* dispatcher node */}
          <g>
            <rect x="200" y="10" width="120" height="36" rx="8" className="fill-primary" />
            <text x="260" y="33" textAnchor="middle" className="fill-primary-foreground text-[11px] font-semibold">
              dispatcher
            </text>
          </g>

          {/* edges dispatcher -> agents */}
          {rooms.map((r, i) => {
            const x = 70 + i * 190
            const active = r.status === 'running'
            const done = r.status === 'done'
            const tripped = r.status === 'tripped' || r.status === 'error'
            const stroke = active ? '#0ea5e9' : done ? '#10b981' : tripped ? '#ef4444' : '#94a3b8'
            return (
              <path
                key={`e-${r.id}`}
                d={`M 260 46 C 260 70, ${x} 70, ${x} 100`}
                fill="none"
                stroke={stroke}
                strokeWidth={active ? 2.5 : 1.5}
                strokeDasharray={active ? '5 3' : 'none'}
              />
            )
          })}

          {/* agent nodes */}
          {rooms.map((r, i) => {
            const x = 70 + i * 190
            const active = r.status === 'running'
            const done = r.status === 'done'
            const tripped = r.status === 'tripped' || r.status === 'error'
            const fill = active ? '#0ea5e9' : done ? '#10b981' : tripped ? '#ef4444' : '#cbd5e1'
            return (
              <g key={r.id}>
                <rect x={x - 55} y="100" width="110" height="40" rx="8" fill={fill} opacity={0.92} />
                <text x={x} y="116" textAnchor="middle" className="fill-white text-[10px] font-semibold">
                  {r.llm}
                </text>
                <text x={x} y="131" textAnchor="middle" className="fill-white/90 text-[9px]">
                  {r.topic.slice(0, 16)}
                </text>
              </g>
            )
          })}

          {/* edges agents -> merge */}
          {rooms.map((r, i) => {
            const x = 70 + i * 190
            const stroke = allDone ? '#10b981' : anyRunning ? '#0ea5e9' : '#94a3b8'
            return (
              <path
                key={`m-${r.id}`}
                d={`M ${x} 140 C ${x} 168, 260 168, 260 188`}
                fill="none"
                stroke={stroke}
                strokeWidth={allDone ? 2.5 : 1.5}
                strokeDasharray={anyRunning && !allDone ? '5 3' : 'none'}
              />
            )
          })}

          {/* merge node */}
          <g>
            <rect x="200" y="188" width="120" height="28" rx="8" className={allDone ? 'fill-emerald-500' : 'fill-muted-foreground/40'} />
            <text x="260" y="206" textAnchor="middle" className="fill-white text-[10px] font-semibold">
              findings index
            </text>
          </g>
        </svg>
      </CardContent>
    </Card>
  )
}
