'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileText, Cpu, ListChecks, AlertTriangle } from 'lucide-react'
import { useSwarmStore } from '@/lib/agents/store'
import type { ReportRow } from '@/lib/types'

export function ReportsView() {
  const reports = useSwarmStore((s) => s.reports)
  const [selected, setSelected] = useState<ReportRow | null>(null)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" /> Reports
          <Badge variant="outline" className="ml-auto">{reports.length}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Every report is versioned with the LLM model specs that produced it.</p>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {reports.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No reports yet.</p>
            <p className="text-xs text-muted-foreground">Launch the self-demo from the header to generate a versioned report.</p>
          </div>
        ) : (
          <ScrollArea className="h-[560px] pr-3" style={{ scrollbarWidth: 'thin' }}>
            <div className="space-y-2">
              {reports.map((r) => (
                <div key={r.id} className="rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium leading-tight">{r.title}</span>
                    <Badge variant="outline" className="ml-auto gap-1 text-[10px]">
                      <Cpu className="h-3 w-3" /> {r.provider}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.mainGoal}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    {r.models.map((m, i) => (
                      <code key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono">
                        {m.vendor}/{m.model}@{m.version}
                      </code>
                    ))}
                    <span className="flex items-center gap-0.5"><ListChecks className="h-3 w-3" /> {r.taskCount} tasks</span>
                    <span className="flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" /> {r.findingCount} findings</span>
                    <span className="ml-auto tabular-nums">{new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="mt-2 h-7" onClick={() => setSelected(r)}>
                    Open report
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            {selected?.models.map((m, i) => (
              <Badge key={i} variant="secondary" className="gap-1">
                <Cpu className="h-3 w-3" /> {m.vendor}/{m.model}@{m.version}
              </Badge>
            ))}
            <Badge variant="outline">{selected?.taskCount} tasks</Badge>
            <Badge variant="outline">{selected?.findingCount} findings</Badge>
          </div>
          <ScrollArea className="h-[55vh] pr-3" style={{ scrollbarWidth: 'thin' }}>
            <pre className="whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 font-mono text-xs leading-relaxed">
{selected?.body}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
