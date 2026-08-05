'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Brain } from 'lucide-react'
import type { MemoryEvent } from '@/lib/types'
import { useAgentStore } from '@/lib/agents/store'

const KIND_STYLE: Record<string, string> = {
  event: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  finding: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  decision: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
}

export function MemoryTimeline() {
  const memory = useAgentStore((s) => s.memory)
  const rooms = useAgentStore((s) => s.rooms)
  const roomTitle = (id: string | null) =>
    id ? (rooms.find((r) => r.id === id)?.title.split(' · ')[0] ?? 'shared') : 'shared'

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-4 w-4" /> Shared Episodic Memory
          <Badge variant="secondary" className="ml-auto">{memory.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[420px] pr-3" style={{ scrollbarWidth: 'thin' }}>
          {memory.length === 0 ? (
            <p className="py-10 text-center text-sm italic text-muted-foreground">
              No memory events yet. Run agents to populate the shared timeline.
            </p>
          ) : (
            <ol className="relative space-y-3 border-l pl-4">
              {memory.map((e: MemoryEvent) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`rounded px-1.5 py-0.5 font-semibold uppercase ${KIND_STYLE[e.kind] ?? KIND_STYLE.event}`}>
                      {e.kind}
                    </span>
                    <span className="font-medium">{roomTitle(e.roomId)}</span>
                    <span className="ml-auto text-muted-foreground tabular-nums">
                      {new Date(e.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/85">{e.content}</p>
                </li>
              ))}
            </ol>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
