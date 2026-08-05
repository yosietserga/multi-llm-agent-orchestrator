import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

/** PATCH /api/endpoints/[id] — update an endpoint. */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, provider, baseUrl, apiKey, model, headers, active } = body
    const row = await db.llmEndpoint.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(provider !== undefined ? { provider } : {}),
        ...(baseUrl !== undefined ? { baseUrl } : {}),
        ...(apiKey !== undefined ? { apiKey } : {}),
        ...(model !== undefined ? { model } : {}),
        ...(headers !== undefined ? { headers: JSON.stringify(headers) } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    })
    return NextResponse.json({ endpoint: { id: row.id, name: row.name, provider: row.provider, baseUrl: row.baseUrl, model: row.model, active: row.active } })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'update failed' }, { status: 500 })
  }
}

/** DELETE /api/endpoints/[id] — remove an endpoint. */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    await db.llmEndpoint.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'delete failed' }, { status: 500 })
  }
}
