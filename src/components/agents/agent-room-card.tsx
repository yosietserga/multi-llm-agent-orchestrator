'use client'

import { useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Play,
  Square,
  RotateCcw,
  Zap,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  CircleDot,
} from 'lucide-react'
import type { LiveRoom } from '@/lib/types'

const ACCENT: Record<string, { ring: string; text: string; bg: string; dot: string; bar: string }> = {
  emerald: { ring: 'ring-emerald-500/40', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500', bar: '[&>div]:bg-emerald-500' },
  rose: { ring: 'ring-rose-500/40', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', dot: 'bg-rose-500', bar: '[&>div]:bg-rose-500' },
  violet: { ring: 'ring-violet-500/40', text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10', dot: 'bg-violet-500', bar: '[&>div]:bg-violet-500' },
}

const SEVERITY: Record<string, string> = {
  info: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  warn: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  critical: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
}

function StatusBadge({ status }: { status: LiveRoom['status'] }) {
  switch (status) {
    case 'running':
      return (
        <Badge variant="secondary" className="gap-1 bg-sky-500/15 text-sky-700 dark:text-sky-300">
          <Loader2 className="h-3 w-3 animate-spin" /> running
        </Badge>
      )
    case 'done':
      return (
        <Badge variant="secondary" className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" /> done
        </Badge>
      )
    case 'tripped':
      return (
        <Badge variant="secondary" className="gap-1 bg-red-500/15 text-red-700 dark:text-red-300">
          <ShieldAlert className="h-3 w-3" /> circuit tripped
        </Badge>
      )
    case 'error':
      return (
        <Badge variant="secondary" className="gap-1 bg-red-500/15 text-red-700 dark:text-red-300">
          <ShieldAlert className="h-3 w-3" /> error
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className="gap-1 bg-muted text-muted-foreground">
          <CircleDot className="h-3 w-3" /> idle
        </Badge>
      )
  }
}

interface Props {
  room: LiveRoom
  connected: boolean
  onRun: (id: string) => void
  onStop: (id: string) => void
  onReset: (id: string) => void
  onSelect: (id: string) => void
  selected: boolean
}

export function AgentRoomCard({ room, connected, onRun, onStop, onReset, onSelect, selected }: Props) {
  const accent = ACCENT[room.accent] ?? ACCENT.emerald
  const streamRef = useRef<HTMLDivElement>(null)
  const running = room.status === 'running'

  // Auto-scroll streaming buffer to bottom.
  useEffect(() => {
    const el = streamRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [room.streamBuffer])

  const bufferPct = room.streamBuffer.length > 0 ? Math.min(100, Math.round((room.streamBuffer.length / 1400) * 100)) : 0

  // Strip markdown code fences from the displayed stream for a clean JSON view.
  const displayBuffer = room.streamBuffer
    .replace(/```json\s*/gi, '')
    .replace(/```\s*$/gi, '')
    .trim()

  return (
    <Card
      className={`flex flex-col ring-1 ${accent.ring} transition-all ${selected ? 'shadow-md' : ''} hover:shadow-md`}
      data-testid={`room-card-${room.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${accent.dot}`} />
              <span className={`text-xs font-semibold uppercase tracking-wide ${accent.text}`}>
                {room.llm}
              </span>
              <span className="text-xs text-muted-foreground">/ {room.topic}</span>
            </div>
            <h3 className="text-base font-semibold leading-tight">{room.title}</h3>
          </div>
          <StatusBadge status={room.status} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        {/* Circuit-breaker indicator */}
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Zap className="h-3.5 w-3.5" /> circuit
          </span>
          <span className={room.circuitOpen ? 'font-medium text-red-600 dark:text-red-400' : 'font-medium text-emerald-600 dark:text-emerald-400'}>
            {room.circuitOpen ? `open (${room.failures} fails)` : `closed (${room.failures}/${3})`}
          </span>
        </div>

        {/* Streaming output */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>agent stream</span>
            {running && <span className="tabular-nums">{room.streamBuffer.length} chars</span>}
          </div>
          <div
            ref={streamRef}
            className="h-40 w-full overflow-y-auto rounded-md border bg-background/60 p-2.5 font-mono text-xs leading-relaxed text-foreground/90"
            style={{ scrollbarWidth: 'thin' }}
          >
            {displayBuffer ? (
              <pre className="whitespace-pre-wrap break-words">{displayBuffer}</pre>
            ) : (
              <span className="text-muted-foreground italic">
                {running ? 'awaiting first token…' : 'no output yet — press Run.'}
              </span>
            )}
          </div>
          {running && <Progress value={bufferPct} className={`h-1 ${accent.bar}`} />}
        </div>

        {/* Summary */}
        {room.summary && (
          <div className={`rounded-md border p-2.5 text-xs ${accent.bg}`}>
            <p className={`font-semibold ${accent.text}`}>summary</p>
            <p className="mt-0.5 text-foreground/80">{room.summary}</p>
          </div>
        )}

        {/* Findings (committed) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>committed findings</span>
            <span className="tabular-nums">{room.findings.length}</span>
          </div>
          <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
            {room.findings.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">none yet</p>
            ) : (
              room.findings.map((f) => (
                <div key={f.id} className="rounded-md border p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${SEVERITY[f.severity] ?? SEVERITY.info}`}>
                      {f.severity}
                    </span>
                    <span className="font-medium leading-tight">{f.title}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{f.detail}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto flex items-center gap-2 pt-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" onClick={() => onRun(room.id)} disabled={!connected || running || room.circuitOpen} className="gap-1.5">
                  <Play className="h-3.5 w-3.5" /> Run
                </Button>
              </TooltipTrigger>
              <TooltipContent>{room.circuitOpen ? 'circuit open — reset first' : 'start this agent'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button size="sm" variant="outline" onClick={() => onStop(room.id)} disabled={!running} className="gap-1.5">
            <Square className="h-3.5 w-3.5" /> Stop
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onReset(room.id)} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onSelect(room.id)} className="ml-auto">
            inspect
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
