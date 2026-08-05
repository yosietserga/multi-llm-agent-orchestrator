import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/** GET /api/findings — cross-room findings index. */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const roomId = searchParams.get('roomId')
    const onlyValidated = searchParams.get('validated') === 'true'

    const findings = await db.finding.findMany({
      where: {
        ...(roomId ? { roomId } : {}),
        ...(onlyValidated ? { validated: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { room: { select: { title: true, llm: true, topic: true } } },
    })
    return NextResponse.json({ findings })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fetch failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/findings — commit a finding (called by the mini-service only AFTER
 * the agent's output passes the Zod schema contract = Two-Phase Commit).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { roomId, severity, title, detail, validated } = body
    if (!roomId || !severity || !title || !detail) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 })
    }
    const finding = await db.finding.create({
      data: {
        roomId,
        severity,
        title: String(title).slice(0, 140),
        detail: String(detail).slice(0, 1200),
        validated: Boolean(validated),
      },
    })
    return NextResponse.json({ finding }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'create failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
