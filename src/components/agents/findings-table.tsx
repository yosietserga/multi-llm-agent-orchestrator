'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ListChecks } from 'lucide-react'
import { useAgentStore } from '@/lib/agents/store'

const SEV: Record<string, string> = {
  info: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  warn: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  critical: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
}

/**
 * Findings Index — the root index of all committed findings across rooms
 * (the persisted artifact, analogous to /docs/reports/ in Round 52).
 */
export function FindingsTable() {
  const rooms = useAgentStore((s) => s.rooms)
  const all = rooms.flatMap((r) => r.findings.map((f) => ({ ...f, roomTitle: r.title, llm: r.llm })))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="h-4 w-4" /> Findings Index
          <Badge variant="secondary" className="ml-auto">{all.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[320px] pr-3" style={{ scrollbarWidth: 'thin' }}>
          {all.length === 0 ? (
            <p className="py-10 text-center text-sm italic text-muted-foreground">
              No committed findings yet. Run agents in parallel to populate the index.
            </p>
          ) : (
            <div className="space-y-2">
              {all.map((f) => (
                <div key={f.id} className="rounded-md border p-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${SEV[f.severity] ?? SEV.info}`}>
                      {f.severity}
                    </span>
                    <span className="font-medium leading-tight">{f.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{f.llm}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{f.detail}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
