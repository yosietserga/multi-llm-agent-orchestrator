import { NextResponse } from 'next/server'
import { MCP_CONNECTORS, MCP_COUNT } from '@/lib/agents/mcp'

/** GET /api/mcp — built-in MCP connectors. */
export async function GET() {
  return NextResponse.json({ count: MCP_COUNT, connectors: MCP_CONNECTORS })
}
