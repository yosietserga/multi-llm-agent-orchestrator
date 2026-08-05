import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/rooms/[id]/messages
 * Appends an agent message to the room log (called by the agent-service
 * mini-service at the end of a run). Bounded to prevent unbounded writes
 * (security cold-run mitigation) — keeps the latest 200 messages per room.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await req.json()
    const { role, content, tokenEst } = body
    if (!role || typeof content !== 'string') {
      return NextResponse.json({ error: 'role and content required' }, { status: 400 })
    }
    const message = await db.agentMessage.create({
      data: {
        roomId: id,
        role,
        content,
        tokenEst: typeof tokenEst === 'number' ? tokenEst : Math.ceil(content.length / 4),
      },
    })

    // Bounded retention — keep latest 200 per room.
    const count = await db.agentMessage.count({ where: { roomId: id } })
    if (count > 200) {
      const overflow = await db.agentMessage.findMany({
        where: { roomId: id },
        orderBy: { createdAt: 'asc' },
        take: count - 200,
        select: { id: true },
      })
      if (overflow.length) {
        await db.agentMessage.deleteMany({ where: { id: { in: overflow.map((m) => m.id) } } })
      }
    }
    return NextResponse.json({ message }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'append failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
