'use client'

import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { MessagesSquare, Play, Square, RotateCcw, Zap } from 'lucide-react'
import { useSwarmStore } from '@/lib/agents/store'
import { ROOM_CONFIG } from '@/lib/agents/config'

const ACCENT: Record<string, { ring: string; text: string; bg: string; dot: string; bar: string }> = {
  emerald: { ring: 'ring-emerald-500/40', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500', bar: '[&>div]:bg-emerald-500' },
  rose: { ring: 'ring-rose-500/40', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', dot: 'bg-rose-500', bar: '[&>div]:bg-rose-500' },
  violet: { ring: 'ring-violet-500/40', text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10', dot: 'bg-violet-500', bar: '[&>div]:bg-violet-500' },
}

const SEV: Record<string, string> = {
  info: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  warn: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  critical: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
}

interface Props {
  connected: boolean
  onRun: (id: string) => void
  onStop: (id: string) => void
  onReset: (id: string) => void
}

export function ChatRoomsView({ connected, onRun, onStop, onReset }: Props) {
  const rooms = useSwarmStore((s) => s.rooms)
  const selectedRoomId = useSwarmStore((s) => s.selectedRoomId)
  const setSelectedRoom = useSwarmStore((s) => s.setSelectedRoom)
  const room = rooms.find((r) => r.id === selectedRoomId) ?? rooms[0]
  const accent = ACCENT[room?.accent ?? 'emerald'] ?? ACCENT.emerald
  const streamRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = streamRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [room?.streamBuffer])

  const displayBuffer = room?.streamBuffer?.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim() ?? ''
  const running = room?.status === 'running'
  const bufferPct = (room?.streamBuffer.length ?? 0) > 0 ? Math.min(100, Math.round(((room?.streamBuffer.length ?? 0) / 1400) * 100)) : 0

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessagesSquare className="h-4 w-4" /> Chat Rooms
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 gap-3 overflow-hidden">
        {/* room list */}
        <div className="flex w-56 shrink-0 flex-col gap-1.5">
          {rooms.map((r) => {
            const a = ACCENT[r.accent] ?? ACCENT.emerald
            const active = r.id === room?.id
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRoom(r.id)}
                className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm transition-colors ${active ? 'bg-muted' : 'hover:bg-muted/50'}`}
              >
                <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${a.dot}`} />
                <span className="flex-1 truncate">
                  <span className="block truncate font-medium leading-tight">{r.title}</span>
                  <span className="block text-[10px] text-muted-foreground">{r.llm} · {r.topic}</span>
                </span>
                {r.status === 'running' && <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />}
                {r.status === 'done' && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
              </button>
            )
          })}
          <div className="mt-2 rounded-md border border-dashed p-2 text-[10px] text-muted-foreground">
            {ROOM_CONFIG.length} persona rooms · GLM-powered
          </div>
        </div>

        {/* active room */}
        <div className="flex flex-1 flex-col gap-2 overflow-hidden">
          {room && (
            <>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold uppercase tracking-wide ${accent.text}`}>{room.llm}</span>
                <span className="text-xs text-muted-foreground">/ {room.topic}</span>
                <Badge variant="secondary" className="ml-auto">{room.status}</Badge>
                <Badge variant="outline" className="gap-1">
                  <Zap className="h-3 w-3" /> {room.circuitOpen ? `open (${room.failures})` : `closed (${room.failures}/3)`}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 border-b pb-1.5 text-[11px] text-muted-foreground">
                <span className="font-medium">model:</span>
                <span className="font-mono">z-ai / glm-5.2-max @ glm-5.2-max@2025-01</span>
              </div>

              <div
                ref={streamRef}
                className="h-[280px] w-full overflow-y-auto rounded-md border bg-background/60 p-2.5 font-mono text-xs leading-relaxed"
                style={{ scrollbarWidth: 'thin' }}
              >
                {displayBuffer ? (
                  <pre className="whitespace-pre-wrap break-words text-foreground/90">{displayBuffer}</pre>
                ) : (
                  <span className="italic text-muted-foreground">
                    {running ? 'awaiting first token…' : 'no output yet — press Run.'}
                  </span>
                )}
              </div>
              {running && <Progress value={bufferPct} className={`h-1 ${accent.bar}`} />}

              {/* findings */}
              <div className="flex-1 overflow-hidden">
                <div className="mb-1 text-xs text-muted-foreground">committed findings ({room.findings.length})</div>
                <ScrollArea className="h-[120px] pr-2" style={{ scrollbarWidth: 'thin' }}>
                  <div className="space-y-1.5">
                    {room.findings.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">none yet</p>
                    ) : (
                      room.findings.map((f) => (
                        <div key={f.id} className="rounded-md border p-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${SEV[f.severity] ?? SEV.info}`}>{f.severity}</span>
                            <span className="font-medium leading-tight">{f.title}</span>
                            {f.model && <span className="ml-auto font-mono text-[9px] text-muted-foreground">{f.provider}/{f.model}</span>}
                          </div>
                          <p className="mt-1 text-muted-foreground">{f.detail}</p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" onClick={() => onRun(room.id)} disabled={!connected || running || room.circuitOpen} className="gap-1.5">
                  <Play className="h-3.5 w-3.5" /> Run
                </Button>
                <Button size="sm" variant="outline" onClick={() => onStop(room.id)} disabled={!running} className="gap-1.5">
                  <Square className="h-3.5 w-3.5" /> Stop
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onReset(room.id)} className="gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
