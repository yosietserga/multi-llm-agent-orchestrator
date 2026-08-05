import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/** GET /api/memory — shared episodic memory timeline (cross-room). */
export async function GET() {
  try {
    const memory = await db.episodicMemory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { room: { select: { title: true, llm: true } } },
    })
    return NextResponse.json({ memory })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fetch failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** POST /api/memory — append a memory event (called by the mini-service). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { roomId, kind, content } = body
    if (!kind || typeof content !== 'string') {
      return NextResponse.json({ error: 'kind and content required' }, { status: 400 })
    }
    // Bounded retention — keep latest 500 memory events (security mitigation).
    const event = await db.episodicMemory.create({
      data: {
        roomId: roomId ?? null,
        kind,
        content: String(content).slice(0, 1000),
      },
    })
    const count = await db.episodicMemory.count()
    if (count > 500) {
      const overflow = await db.episodicMemory.findMany({
        orderBy: { createdAt: 'asc' },
        take: count - 500,
        select: { id: true },
      })
      if (overflow.length) {
        await db.episodicMemory.deleteMany({ where: { id: { in: overflow.map((m) => m.id) } } })
      }
    }
    return NextResponse.json({ event }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'create failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
