import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, seedDemoUsers } from '@/lib/auth'

/** GET /api/auth/me — return current user from cookie (and seed demo users). */
export async function GET(req: NextRequest) {
  try {
    await seedDemoUsers()
    const user = getUserFromRequest(req)
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ user: null })
  }
}
