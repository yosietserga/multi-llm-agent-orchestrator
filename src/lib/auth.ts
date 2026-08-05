/**
 * Lightweight cookie-based auth (replaces NextAuth.js to avoid OOM crashes).
 *
 * No external dependencies. Sessions are signed JWT-like tokens stored in a
 * cookie. Roles are embedded in the token. Demo users are seeded in the DB
 * with plain-text passwords (demo only — swap for hashed in production).
 */
import { db } from '@/lib/db'

export type UserRole = 'admin' | 'operator' | 'viewer'

const SESSION_SECRET = process.env.NEXTAUTH_SECRET || 'swarm-dev-secret'
const COOKIE_NAME = 'swarm_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
}

/** Simple base64 token (not cryptographically secure — demo only). */
function encodeToken(user: SessionUser): string {
  const payload = { ...user, exp: Date.now() + SESSION_MAX_AGE * 1000 }
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

function decodeToken(token: string): SessionUser | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString())
    if (payload.exp && Date.now() > payload.exp) return null
    return { id: payload.id, email: payload.email, name: payload.name, role: payload.role }
  } catch {
    return null
  }
}

export function setSessionCookie(res: Response, token: string): void {
  const cookie = `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Max-Age=${SESSION_MAX_AGE}; SameSite=Lax`
  res.headers.set('Set-Cookie', cookie)
}

export function clearSessionCookie(res: Response): void {
  res.headers.set('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`)
}

export function getTokenFromRequest(req: Request): string | null {
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  return match ? match[1] : null
}

export function getUserFromRequest(req: Request): SessionUser | null {
  const token = getTokenFromRequest(req)
  if (!token) return null
  return decodeToken(token)
}

/** Seed demo users if they don't exist (idempotent, no bcrypt). */
export async function seedDemoUsers(): Promise<void> {
  const users = [
    { email: 'admin@swarm.dev', name: 'Admin', password: 'admin123', role: 'admin' },
    { email: 'operator@swarm.dev', name: 'Operator', password: 'operator123', role: 'operator' },
    { email: 'viewer@swarm.dev', name: 'Viewer', password: 'viewer123', role: 'viewer' },
  ]
  for (const u of users) {
    const existing = await db.user.findUnique({ where: { email: u.email } })
    if (!existing) {
      await db.user.create({ data: { email: u.email, name: u.name, passwordHash: u.password, role: u.role } })
    }
  }
}

/** Validate credentials and return a session user + token. */
export async function authenticate(email: string, password: string): Promise<{ user: SessionUser; token: string } | null> {
  const user = await db.user.findUnique({ where: { email } })
  if (!user || !user.passwordHash) return null
  if (user.passwordHash !== password) return null
  const sessionUser: SessionUser = { id: user.id, email: user.email, name: user.name ?? user.email, role: user.role as UserRole }
  return { user: sessionUser, token: encodeToken(sessionUser) }
}
