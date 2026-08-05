import { getServerSession } from 'next-auth'
import { authOptions, type UserRole } from './auth'

/** Get the current session on the server side. */
export async function getSession() {
  return getServerSession(authOptions)
}

/** Get the current user's role (or 'viewer' if unauthenticated). */
export async function getUserRole(): Promise<UserRole> {
  const session = await getSession()
  return ((session?.user as { role?: string })?.role as UserRole) ?? 'viewer'
}

/** Check if the current user has at least the required role. */
export async function hasRole(required: UserRole): Promise<boolean> {
  const role = await getUserRole()
  const hierarchy: Record<UserRole, number> = { viewer: 0, operator: 1, admin: 2 }
  return hierarchy[role] >= hierarchy[required]
}
