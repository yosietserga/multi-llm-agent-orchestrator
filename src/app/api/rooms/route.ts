import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/** GET /api/rooms — root index of all agent "chat rooms". */
export async function GET() {
  try {
    const rooms = await db.agentRoom.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { findings: true, messages: true } },
      },
    })
    const serialized = rooms.map((r) => ({
      ...r,
      allowedTools: safeParse(r.allowedTools, []),
      findingsCount: r._count.findings,
      messagesCount: r._count.messages,
    }))
    return NextResponse.json({ rooms: serialized })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fetch failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** POST /api/rooms — create a custom room (used by the mini-service / future UI). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, llm, topic, title, systemPrompt, taskPrompt, allowedTools, schemaContract } = body
    if (!llm || !topic || !title || !systemPrompt || !taskPrompt) {
      return NextResponse.json({ error: 'missing required fields' }, { status: 400 })
    }
    const room = await db.agentRoom.create({
      data: {
        id: id ?? undefined,
        llm,
        topic,
        title,
        systemPrompt,
        taskPrompt,
        allowedTools: JSON.stringify(allowedTools ?? []),
        schemaContract: schemaContract ?? '{}',
      },
    })
    return NextResponse.json({ room: { ...room, allowedTools: allowedTools ?? [] } }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'create failed'
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
