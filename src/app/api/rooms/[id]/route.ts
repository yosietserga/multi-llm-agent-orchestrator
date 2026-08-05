import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

/** GET /api/rooms/[id] — room detail with messages + findings. */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const room = await db.agentRoom.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        findings: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!room) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({
      room: {
        ...room,
        allowedTools: safeParse(room.allowedTools, []),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fetch failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** PATCH /api/rooms/[id] — update status / circuit-breaker counters. */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status, failures, circuitOpen } = body
    const room = await db.agentRoom.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(failures !== undefined ? { failures } : {}),
        ...(circuitOpen !== undefined ? { circuitOpen } : {}),
      },
    })
    return NextResponse.json({ room: { ...room, allowedTools: safeParse(room.allowedTools, []) } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'update failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function safeParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
