import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ROOM_CONFIG } from '@/lib/agents/config'

/**
 * POST /api/seed
 * Idempotently seeds the three agent rooms from ROOM_CONFIG.
 * Safe to call repeatedly — upserts by id.
 */
export async function POST() {
  try {
    for (const room of ROOM_CONFIG) {
      await db.agentRoom.upsert({
        where: { id: room.id },
        create: {
          id: room.id,
          llm: room.llm,
          topic: room.topic,
          title: room.title,
          systemPrompt: room.systemPrompt,
          taskPrompt: room.taskPrompt,
          allowedTools: JSON.stringify(room.allowedTools),
          schemaContract: room.contract,
        },
        update: {
          llm: room.llm,
          topic: room.topic,
          title: room.title,
          systemPrompt: room.systemPrompt,
          taskPrompt: room.taskPrompt,
          allowedTools: JSON.stringify(room.allowedTools),
          schemaContract: room.contract,
        },
      })
    }
    const rooms = await db.agentRoom.findMany({ orderBy: { createdAt: 'asc' } })
    return NextResponse.json({ ok: true, count: rooms.length, rooms })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'seed failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
