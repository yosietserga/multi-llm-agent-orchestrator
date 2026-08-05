'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileJson } from 'lucide-react'
import { useAgentStore } from '@/lib/agents/store'

const FIELDS = [
  { key: 'summary', type: 'string', constraint: 'min(1) max(500)' },
  { key: 'findings', type: 'array', constraint: 'min(1) max(8)' },
  { key: 'findings[].severity', type: 'enum', constraint: '"info" | "warn" | "critical"' },
  { key: 'findings[].title', type: 'string', constraint: 'min(1) max(140)' },
  { key: 'findings[].detail', type: 'string', constraint: 'min(1) max(1200)' },
]

export function SchemaInspector() {
  const selectedId = useAgentStore((s) => s.selectedRoomId)
  const room = useAgentStore((s) => s.rooms.find((r) => r.id === s.selectedRoomId))

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileJson className="h-4 w-4" /> Schema Contract
        </CardTitle>
        {room && (
          <p className="text-xs text-muted-foreground">
            selected: <span className="font-medium text-foreground">{room.title}</span>
          </p>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[300px] pr-3" style={{ scrollbarWidth: 'thin' }}>
          {room ? (
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">typed contract (zod)</p>
                <pre className="overflow-x-auto rounded-md border bg-muted/40 p-2.5 font-mono text-[11px] leading-relaxed">
{`AgentOutputSchema = {
  summary: string,
  findings: [
    { severity, title, detail }
  ] (1..8)
}`}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">field constraints</p>
                <div className="space-y-1">
                  {FIELDS.map((f) => (
                    <div key={f.key} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs">
                      <code className="font-mono text-foreground">{f.key}</code>
                      <Badge variant="outline" className="text-[10px]">{f.type}</Badge>
                      <span className="ml-auto font-mono text-muted-foreground">{f.constraint}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                <strong>Two-phase commit:</strong> an agent&apos;s output is only persisted as findings after it passes this
                schema. Invalid output is rejected (<code>phase: rejected</code>) and never written.
              </div>
            </div>
          ) : (
            <p className="py-10 text-center text-sm italic text-muted-foreground">select a room to inspect its contract</p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
