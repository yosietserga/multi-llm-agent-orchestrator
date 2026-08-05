import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

/**
 * POST /api/auth/seed-admin
 * Idempotently seeds 3 demo users (admin/operator/viewer) so the auth flow
 * is testable out of the box. Safe to call repeatedly — upserts by email.
 *
 * Demo credentials (returned in the response for convenience):
 *   admin@swarm.dev     / admin123     (full access)
 *   operator@swarm.dev  / operator123  (run demos, no endpoint delete)
 *   viewer@swarm.dev    / viewer123    (read-only)
 */
export async function POST() {
  const users = [
    { email: 'admin@swarm.dev', name: 'Admin', password: 'admin123', role: 'admin' },
    { email: 'operator@swarm.dev', name: 'Operator', password: 'operator123', role: 'operator' },
    { email: 'viewer@swarm.dev', name: 'Viewer', password: 'viewer123', role: 'viewer' },
  ]
  try {
    for (const u of users) {
      const passwordHash = await bcrypt.hash(u.password, 10)
      await db.user.upsert({
        where: { email: u.email },
        create: { email: u.email, name: u.name, passwordHash, role: u.role },
        update: { name: u.name, passwordHash, role: u.role },
      })
    }
    return NextResponse.json({
      ok: true,
      users: users.map((u) => ({ email: u.email, name: u.name, role: u.role, password: u.password })),
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'seed failed' }, { status: 500 })
  }
}
