import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/** GET /api/endpoints — list custom LLM endpoints (apiKey masked). */
export async function GET() {
  try {
    const rows = await db.llmEndpoint.findMany({ orderBy: { createdAt: 'desc' } })
    const endpoints = rows.map((r) => ({
      id: r.id,
      name: r.name,
      provider: r.provider,
      baseUrl: r.baseUrl,
      model: r.model,
      active: r.active,
      apiKeyMasked: r.apiKey ? `${r.apiKey.slice(0, 6)}…${r.apiKey.slice(-3)}` : '',
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }))
    return NextResponse.json({ endpoints })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'fetch failed' }, { status: 500 })
  }
}

/** POST /api/endpoints — create a custom OpenAI/Anthropic-compatible endpoint. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, provider, baseUrl, apiKey, model, headers, active } = body
    if (!name || !baseUrl || !model) {
      return NextResponse.json({ error: 'name, baseUrl, and model are required' }, { status: 400 })
    }
    const row = await db.llmEndpoint.create({
      data: {
        name,
        provider: provider ?? 'openai',
        baseUrl,
        apiKey: apiKey ?? '',
        model,
        headers: JSON.stringify(headers ?? {}),
        active: active ?? true,
      },
    })
    return NextResponse.json({
      endpoint: {
        id: row.id,
        name: row.name,
        provider: row.provider,
        baseUrl: row.baseUrl,
        model: row.model,
        active: row.active,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      },
    }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'create failed' }, { status: 500 })
  }
}
