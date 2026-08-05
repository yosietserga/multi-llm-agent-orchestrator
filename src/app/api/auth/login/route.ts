import { NextRequest, NextResponse } from 'next/server'
import { authenticate, setSessionCookie, seedDemoUsers } from '@/lib/auth'

/** POST /api/auth/login — lightweight login (sets cookie, returns user). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body
    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 })
    }
    // Ensure demo users exist.
    await seedDemoUsers()
    const result = await authenticate(email, password)
    if (!result) {
      return NextResponse.json({ error: 'invalid credentials' }, { status: 401 })
    }
    const res = NextResponse.json({ user: result.user })
    setSessionCookie(res, result.token)
    return res
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'login failed' }, { status: 500 })
  }
}
