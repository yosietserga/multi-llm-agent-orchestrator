import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { SwarmTask } from '@/lib/types'
import { LLM_BY_ID } from '@/lib/agents/models'

/** GET /api/tasks — return the swarm task tree. */
export async function GET() {
  try {
    const rows = await db.agentTask.findMany({ orderBy: { createdAt: 'asc' } })
    const byId = new Map<string, any>()
    for (const r of rows) byId.set(r.id, { ...r, children: [] as any[] })
    const roots: any[] = []
    for (const r of rows) {
      if (r.parentId && byId.has(r.parentId)) {
        byId.get(r.parentId)!.children.push(byId.get(r.id)!)
      } else if (!r.parentId) {
        roots.push(byId.get(r.id)!)
      }
    }
    const build = (node: any): SwarmTask => toTask(node, (node.children ?? []).map(build))
    return NextResponse.json({ tasks: roots.map(build) })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'fetch failed' }, { status: 500 })
  }
}

function toTask(row: any, children: SwarmTask[] = []): SwarmTask {
  return {
    id: row.id,
    parentId: row.parentId ?? null,
    roomId: row.roomId ?? null,
    title: row.title,
    goal: row.goal,
    status: row.status,
    kind: row.kind,
    model: {
      provider: row.provider,
      model: row.assignedModel,
      version: row.modelVersion ?? '',
      vendor: LLM_BY_ID[row.assignedModel]?.vendor ?? row.provider,
    },
    mainGoal: row.mainGoal ?? null,
    result: row.result ?? null,
    summary: row.summary ?? null,
    column: row.column,
    priority: row.priority ?? 0,
    depth: row.depth ?? 0,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    startedAt: row.startedAt instanceof Date ? row.startedAt.toISOString() : null,
    finishedAt: row.finishedAt instanceof Date ? row.finishedAt.toISOString() : null,
    durationMs: row.durationMs ?? null,
    children,
  }
}
