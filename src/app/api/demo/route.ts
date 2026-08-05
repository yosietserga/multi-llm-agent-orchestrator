import { NextRequest, NextResponse } from 'next/server'
import { getAgentServer, DEMO_MODEL_SPEC } from '@/lib/agents/agent-server'

/**
 * POST /api/demo — launch the GLM-only orchestrated demo directly (without
 * needing the browser socket connected for the whole run).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const mainGoal = body.mainGoal || 'Audit the Multi-LLM Agent Swarm Platform for production readiness: architecture, security, feature completeness, and UX.'
    const state = await getAgentServer()
    const { runDemo } = await import('@/lib/agents/agent-server')
    void runDemo(state, mainGoal).catch(() => {})
    return NextResponse.json({ ok: true, mainGoal, model: DEMO_MODEL_SPEC })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'demo failed' }, { status: 500 })
  }
}
