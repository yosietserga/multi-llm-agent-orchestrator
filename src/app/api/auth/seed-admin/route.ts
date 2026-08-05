import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

/**
 * POST /api/auth/seed-admin
 * Idempotently seeds 3 demo users (admin/operator/viewer). Skips re-hashing
 * if the users already exist (avoids bcrypt CPU spike on every page load).
 */
export async function POST() {
  const users = [
    { email: 'admin@swarm.dev', name: 'Admin', password: 'admin123', role: 'admin' },
    { email: 'operator@swarm.dev', name: 'Operator', password: 'operator123', role: 'operator' },
    { email: 'viewer@swarm.dev', name: 'Viewer', password: 'viewer123', role: 'viewer' },
  ]
  try {
    // Fast path: if all 3 users exist, skip bcrypt entirely.
    const existing = await db.user.count({ where: { email: { in: users.map((u) => u.email) } } })
    if (existing >= users.length) {
      return NextResponse.json({ ok: true, skipped: true, users: users.map((u) => ({ email: u.email, name: u.name, role: u.role, password: u.password })) })
    }
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
