import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export type UserRole = 'admin' | 'operator' | 'viewer'

/**
 * NextAuth.js v4 configuration.
 * - Credentials provider (email + password) for the demo.
 * - Prisma adapter for session persistence.
 * - Role is attached to the JWT and session token.
 *
 * In production: swap CredentialsProvider for OAuth (GitHub, Google) and
 * set NEXTAUTH_SECRET to a strong random value (see .env.example).
 */
export const authOptions: NextAuthOptions = {
  // PrismaAdapter requires a @auth/prisma-adapter-compatible schema.
  // We use a lightweight JWT strategy instead to avoid adapter coupling.
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await db.user.findUnique({ where: { email: credentials.email } })
        if (!user || !user.passwordHash) return null
        const ok = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!ok) return null
        return { id: user.id, email: user.email, name: user.name ?? undefined, role: user.role }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? 'viewer'
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as { role?: string }).role = (token.role as string) ?? 'viewer'
        ;(session.user as { id?: string }).id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/',
  },
}
