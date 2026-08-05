'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { BarChart3 } from 'lucide-react'
import { useSwarmStore, flattenTasks } from '@/lib/agents/store'
import type { SwarmTask } from '@/lib/types'

const KIND_COLOR: Record<string, string> = {
  orchestrator: '#6366f1',
  agent: '#0ea5e9',
  subagent: '#10b981',
}

export function GanttView() {
  const tasks = useSwarmStore((s) => s.tasks)
  const setSelectedTask = useSwarmStore((s) => s.setSelectedTask)
  const flat = useMemo(() => flattenTasks(tasks), [tasks])

  const { minTs, maxTs, span } = useMemo(() => {
    const ts: number[] = [Date.now() - 60_000, Date.now()]
    for (const t of flat) {
      const s = t.startedAt ? new Date(t.startedAt).getTime() : null
      const e = t.finishedAt ? new Date(t.finishedAt).getTime() : null
      const created = new Date(t.createdAt).getTime()
      ts.push(created)
      if (s) ts.push(s)
      if (e) ts.push(e)
      if (s && !e) ts.push(s + 8000)
    }
    const lo = Math.min(...ts)
    const hi = Math.max(...ts)
    return { minTs: lo, maxTs: hi, span: Math.max(hi - lo, 8000) }
  }, [flat])

  function pct(ts: number): number {
    return Math.max(0, Math.min(100, ((ts - minTs) / span) * 100))
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" /> Gantt Timeline
          <Badge variant="outline" className="ml-auto">{flat.length} tasks</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {flat.length === 0 ? (
          <p className="py-10 text-center text-sm italic text-muted-foreground">No tasks. Launch the demo to see the timeline.</p>
        ) : (
          <ScrollArea className="h-[520px] pr-3" style={{ scrollbarWidth: 'thin' }}>
            {/* time axis */}
            <div className="mb-2 ml-44 flex justify-between border-b pb-1 text-[9px] text-muted-foreground">
              <span>{new Date(minTs).toLocaleTimeString()}</span>
              <span>{new Date(minTs + span / 2).toLocaleTimeString()}</span>
              <span>{new Date(maxTs).toLocaleTimeString()}</span>
            </div>
            <div className="space-y-2">
              {flat.map((t) => {
                const created = new Date(t.createdAt).getTime()
                const start = t.startedAt ? new Date(t.startedAt).getTime() : created
                const end = t.finishedAt ? new Date(t.finishedAt).getTime() : t.status === 'running' ? Date.now() : start + 4000
                const left = pct(start)
                const width = Math.max(2, pct(end) - left)
                const color = KIND_COLOR[t.kind] ?? '#94a3b8'
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTask(t.id)}
                    className="flex items-center gap-2 w-full text-left"
                  >
                    <div className="w-44 shrink-0 truncate text-xs">
                      <span className="font-medium">{t.title}</span>
                      <span className="ml-1 text-[9px] text-muted-foreground">({t.kind})</span>
                    </div>
                    <div className="relative h-6 flex-1 rounded bg-muted/40">
                      <div
                        className="absolute top-1 h-4 rounded transition-all"
                        style={{ left: `${left}%`, width: `${width}%`, backgroundColor: color, opacity: t.status === 'done' ? 0.7 : 1 }}
                      >
                        <span className="absolute right-1 top-0 truncate text-[8px] font-medium leading-4 text-white">
                          {t.model.provider}/{t.model.model}
                        </span>
                      </div>
                      {t.status === 'running' && (
                        <div className="absolute top-0 h-6 w-0.5 bg-sky-500" style={{ left: `${pct(Date.now())}%` }}>
                          <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

export type { SwarmTask }
