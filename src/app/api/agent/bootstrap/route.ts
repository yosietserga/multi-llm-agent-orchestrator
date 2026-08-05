import { NextResponse } from 'next/server'
import { ensureAgentServer } from '@/lib/agents/agent-server'

/**
 * GET /api/_agent/bootstrap
 * Ensures the in-process socket.io agent server (port 3003) is booted.
 * Called by the frontend before connecting the socket.
 */
export async function GET() {
  const status = await ensureAgentServer()
  return NextResponse.json(status)
}
