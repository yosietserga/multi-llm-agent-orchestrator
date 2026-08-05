'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plug, CheckCircle2, Settings, CircleDot } from 'lucide-react'
import { MCP_CONNECTORS } from '@/lib/agents/mcp'

const STATUS_META: Record<string, { icon: React.ReactNode; color: string }> = {
  ready: { icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />, color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  configured: { icon: <Settings className="h-3.5 w-3.5 text-amber-500" />, color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  available: { icon: <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />, color: 'bg-muted text-muted-foreground' },
}

export function McpView() {
  const grouped = useMemo(() => {
    const out: Record<string, typeof MCP_CONNECTORS> = {}
    for (const c of MCP_CONNECTORS) {
      if (!out[c.type]) out[c.type] = []
      out[c.type].push(c)
    }
    return out
  }, [])

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Plug className="h-4 w-4" /> MCP Connectors (built-in)
          <Badge variant="outline" className="ml-auto">{MCP_CONNECTORS.length} connectors</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Model Context Protocol bridges the swarm uses to plan cross-system workflows.</p>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[560px] pr-3" style={{ scrollbarWidth: 'thin' }}>
          <div className="space-y-4">
            {Object.entries(grouped).map(([type, connectors]) => (
              <div key={type}>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{type}</h3>
                  <Badge variant="secondary" className="text-[10px]">{connectors.length}</Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {connectors.map((c) => {
                    const sm = STATUS_META[c.status] ?? STATUS_META.available
                    return (
                      <div key={c.id} className="rounded-md border p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted-foreground">mcp:{c.id}</span>
                          <Badge variant="outline" className={`ml-auto gap-1 text-[9px] ${sm.color}`}>
                            {sm.icon} {c.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm font-medium">{c.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{c.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {c.capabilities.map((cap) => (
                            <code key={cap} className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{cap}</code>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
