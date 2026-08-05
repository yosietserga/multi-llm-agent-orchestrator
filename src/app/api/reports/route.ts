import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { ModelSpec, ReportRow } from '@/lib/types'

/** GET /api/reports — versioned reports (each carries model specs). */
export async function GET() {
  try {
    const rows = await db.report.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
    const reports: ReportRow[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      mainGoal: r.mainGoal,
      body: r.body,
      provider: r.provider,
      models: safeParse<ModelSpec[]>(r.models, []),
      taskCount: r.taskCount,
      findingCount: r.findingCount,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }))
    return NextResponse.json({ reports })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'fetch failed' }, { status: 500 })
  }
}

function safeParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
