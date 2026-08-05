'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Cpu, Zap } from 'lucide-react'
import { LLM_REGISTRY } from '@/lib/agents/models'

const ACCENT: Record<string, string> = {
  emerald: 'border-emerald-500/40 bg-emerald-500/5',
  sky: 'border-sky-500/40 bg-sky-500/5',
  amber: 'border-amber-500/40 bg-amber-500/5',
  violet: 'border-violet-500/40 bg-violet-500/5',
  rose: 'border-rose-500/40 bg-rose-500/5',
  cyan: 'border-cyan-500/40 bg-cyan-500/5',
}

export function LlmRegistryPanel() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Cpu className="h-4 w-4" /> LLM Registry
          <Badge variant="outline" className="ml-auto">{LLM_REGISTRY.length} models</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Top LLMs + DeepSeek. Demo runs GLM-only.</p>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="space-y-2">
          {LLM_REGISTRY.map((m) => (
            <div key={m.id} className={`rounded-md border p-2.5 ${ACCENT[m.accent] ?? ACCENT.emerald} ${m.id === 'glm-5.2-max' ? 'ring-1 ring-emerald-500/50' : ''}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{m.name}</span>
                {m.invokable ? (
                  <Badge variant="secondary" className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    <Zap className="h-2.5 w-2.5" /> live
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px]">via endpoint</Badge>
                )}
                {m.id === 'glm-5.2-max' && <Badge variant="secondary" className="ml-auto bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">demo</Badge>}
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                <span className="font-medium">{m.vendor}</span>
                <span className="font-mono">{m.version}</span>
                <span className="tabular-nums">{(m.contextWindow / 1000).toFixed(0)}k ctx</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {m.strengths.slice(0, 3).map((s) => (
                  <code key={s} className="rounded bg-background/60 px-1 py-0.5 text-[9px] text-muted-foreground">{s}</code>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
