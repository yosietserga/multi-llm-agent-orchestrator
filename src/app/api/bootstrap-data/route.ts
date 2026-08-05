import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SKILLS, SKILL_CATEGORIES, INVOKABLE_SKILLS } from '@/lib/agents/skills'
import { MCP_CONNECTORS } from '@/lib/agents/mcp'
import { LLM_REGISTRY } from '@/lib/agents/models'
import type { SwarmTask, LlmEndpointRow, ReportRow, ModelSpec } from '@/lib/types'

/**
 * GET /api/bootstrap-data — combined endpoint that returns ALL data the page
 * needs in a single request (rooms, memory, tasks, endpoints, reports, skills,
 * mcp, models). This avoids 6 separate route compilations on page load, which
 * was causing sandbox OOM crashes.
 */
export async function GET() {
  try {
    // Seed rooms + admin users (idempotent, fast).
    const { ROOM_CONFIG } = await import('@/lib/agents/config')
    for (const room of ROOM_CONFIG) {
      await db.agentRoom.upsert({
        where: { id: room.id },
        create: {
          id: room.id, llm: room.llm, topic: room.topic, title: room.title,
          systemPrompt: room.systemPrompt, taskPrompt: room.taskPrompt,
          allowedTools: JSON.stringify(room.allowedTools), schemaContract: room.contract,
        },
        update: {},
      })
    }

    const [rooms, memory, taskRows, endpointRows, reportRows] = await Promise.all([
      db.agentRoom.findMany({ orderBy: { createdAt: 'asc' } }),
      db.episodicMemory.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
      db.agentTask.findMany({ orderBy: { createdAt: 'asc' } }),
      db.llmEndpoint.findMany({ orderBy: { createdAt: 'desc' } }),
      db.report.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    ])

    // Build task tree
    const byId = new Map<string, any>()
    for (const r of taskRows) byId.set(r.id, { ...r, children: [] as any[] })
    const roots: any[] = []
    for (const r of taskRows) {
      if (r.parentId && byId.has(r.parentId)) byId.get(r.parentId)!.children.push(byId.get(r.id)!)
      else if (!r.parentId) roots.push(byId.get(r.id)!)
    }
    const build = (node: any): SwarmTask => ({
      id: node.id, parentId: node.parentId ?? null, roomId: node.roomId ?? null,
      title: node.title, goal: node.goal, status: node.status, kind: node.kind,
      model: { provider: node.provider, model: node.assignedModel, version: node.modelVersion ?? '', vendor: 'auto' },
      mainGoal: node.mainGoal ?? null, result: node.result ?? null, summary: node.summary ?? null,
      column: node.column, priority: node.priority ?? 0, depth: node.depth ?? 0,
      createdAt: node.createdAt instanceof Date ? node.createdAt.toISOString() : String(node.createdAt),
      startedAt: node.startedAt instanceof Date ? node.startedAt.toISOString() : null,
      finishedAt: node.finishedAt instanceof Date ? node.finishedAt.toISOString() : null,
      durationMs: node.durationMs ?? null,
      children: (node.children ?? []).map(build),
    })

    const endpoints: LlmEndpointRow[] = endpointRows.map((r) => ({
      id: r.id, name: r.name, provider: r.provider, baseUrl: r.baseUrl, model: r.model,
      active: r.active,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }))

    const reports: ReportRow[] = reportRows.map((r) => ({
      id: r.id, title: r.title, mainGoal: r.mainGoal, body: r.body, provider: r.provider,
      models: safeParse<ModelSpec[]>(r.models, []),
      taskCount: r.taskCount, findingCount: r.findingCount,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }))

    return NextResponse.json({
      rooms: rooms.map((r) => ({ ...r, allowedTools: safeParse(r.allowedTools, []) })),
      memory: memory.map((m) => ({
        ...m,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
      })),
      tasks: roots.map(build),
      endpoints,
      reports,
      skills: { count: SKILLS.length, invokableCount: INVOKABLE_SKILLS.length, categories: SKILL_CATEGORIES, skills: SKILLS },
      mcp: { count: MCP_CONNECTORS.length, connectors: MCP_CONNECTORS },
      models: LLM_REGISTRY,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'bootstrap failed' }, { status: 500 })
  }
}

function safeParse<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T } catch { return fallback }
}
