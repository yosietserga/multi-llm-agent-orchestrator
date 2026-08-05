'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { KanbanSquare, Loader2, CheckCircle2, ShieldAlert, CircleDot } from 'lucide-react'
import { useSwarmStore, flattenTasks, TASK_COLUMNS } from '@/lib/agents/store'
import type { SwarmTask } from '@/lib/types'

const STATUS_ICON: Record<string, React.ReactNode> = {
  running: <Loader2 className="h-3 w-3 animate-spin text-sky-500" />,
  done: <CheckCircle2 className="h-3 w-3 text-emerald-500" />,
  blocked: <ShieldAlert className="h-3 w-3 text-amber-500" />,
  tripped: <ShieldAlert className="h-3 w-3 text-red-500" />,
  queued: <CircleDot className="h-3 w-3 text-sky-400" />,
  backlog: <CircleDot className="h-3 w-3 text-muted-foreground" />,
}

export function KanbanView() {
  const tasks = useSwarmStore((s) => s.tasks)
  const setSelectedTask = useSwarmStore((s) => s.setSelectedTask)
  const flat = useMemo(() => flattenTasks(tasks), [tasks])

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <KanbanSquare className="h-4 w-4" /> Kanban
          <Badge variant="outline" className="ml-auto">{flat.length} tasks</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {flat.length === 0 ? (
          <p className="py-10 text-center text-sm italic text-muted-foreground">No tasks. Launch the demo to populate the board.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {TASK_COLUMNS.map((col) => {
              const colTasks = flat.filter((t) => t.status === col.status)
              return (
                <div key={col.id} className="flex flex-col rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col.label}</span>
                    <Badge variant="secondary" className="text-[10px]">{colTasks.length}</Badge>
                  </div>
                  <ScrollArea className="h-[460px] px-2 py-2" style={{ scrollbarWidth: 'thin' }}>
                    <div className="space-y-2">
                      {colTasks.length === 0 ? (
                        <p className="px-2 py-6 text-center text-xs italic text-muted-foreground">empty</p>
                      ) : (
                        colTasks.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setSelectedTask(t.id)}
                            className="w-full rounded-md border bg-background p-2.5 text-left transition-shadow hover:shadow-sm"
                          >
                            <div className="flex items-center gap-1.5">
                              {STATUS_ICON[t.status]}
                              <Badge variant="outline" className="text-[9px] uppercase">{t.kind}</Badge>
                            </div>
                            <p className="mt-1.5 text-sm font-medium leading-tight">{t.title}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.goal}</p>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="font-mono text-[9px] text-muted-foreground">{t.model.provider}/{t.model.model}</span>
                              {t.mainGoal && <span className="text-[9px] text-muted-foreground">★ aligned</span>}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export type { SwarmTask }
