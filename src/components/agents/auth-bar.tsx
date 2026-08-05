'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LogIn, LogOut, UserCircle, Shield, Loader2 } from 'lucide-react'
import { useSwarmStore } from '@/lib/agents/store'
import { useToast } from '@/hooks/use-toast'

const DEMO_USERS = [
  { email: 'admin@swarm.dev', password: 'admin123', role: 'admin' },
  { email: 'operator@swarm.dev', password: 'operator123', role: 'operator' },
  { email: 'viewer@swarm.dev', password: 'viewer123', role: 'viewer' },
]

const ROLE_STYLE: Record<string, string> = {
  admin: 'bg-red-500/15 text-red-700 dark:text-red-300',
  operator: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  viewer: 'bg-muted text-muted-foreground',
}

export function AuthBar() {
  const user = useSwarmStore((s) => s.user)
  const setUser = useSwarmStore((s) => s.setUser)
  const setLastError = useSwarmStore((s) => s.setLastError)
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('admin@swarm.dev')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)

  // Auth calls are DEFERRED to the first "Sign in" click to avoid compiling
  // the NextAuth + bcrypt routes on page load (which causes sandbox OOM).
  const [seeded, setSeeded] = useState(false)

  async function openDialog() {
    setOpen(true)
    if (!seeded) {
      try {
        await fetch('/api/auth/seed-admin', { method: 'POST' })
        const s = await fetch('/api/auth/session').then((r) => r.json())
        if (s?.user?.email) {
          setUser({ email: s.user.email, name: s.user.name ?? s.user.email, role: s.user.role ?? 'viewer' })
        }
      } catch { /* ignore */ }
      setSeeded(true)
    }
  }

  async function login() {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          email,
          password,
          csrfToken: await getCsrfToken(),
          json: 'true',
        }),
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data?.user?.email) {
          setUser({ email: data.user.email, name: data.user.name ?? data.user.email, role: data.user.role ?? 'viewer' })
          toast({ title: `Welcome, ${data.user.name ?? data.user.email}` })
          setOpen(false)
        } else {
          toast({ title: 'Login failed', variant: 'destructive' })
        }
      } else {
        toast({ title: 'Login failed', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Login error', description: err instanceof Error ? err.message : '', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      setUser(null)
      toast({ title: 'Signed out' })
    } catch {}
  }

  async function getCsrfToken(): Promise<string> {
    const r = await fetch('/api/auth/csrf')
    const d = await r.json()
    return d.csrfToken ?? ''
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className={`gap-1 ${ROLE_STYLE[user.role] ?? ROLE_STYLE.viewer}`}>
          <Shield className="h-3 w-3" /> {user.role}
        </Badge>
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <UserCircle className="h-3.5 w-3.5" /> {user.email}
        </span>
        <Button size="sm" variant="ghost" onClick={logout} className="h-7 gap-1.5">
          <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={openDialog}>
          <LogIn className="h-3.5 w-3.5" /> Sign in
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign in to the Swarm Platform</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="auth-email">Email</Label>
            <Input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="auth-pass">Password</Label>
            <Input id="auth-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} />
          </div>
          <div className="rounded-md border bg-muted/40 p-2.5 text-xs">
            <p className="mb-1.5 font-semibold">Demo accounts:</p>
            {DEMO_USERS.map((u) => (
              <button
                key={u.email}
                onClick={() => { setEmail(u.email); setPassword(u.password) }}
                className="mr-1.5 mb-1 inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[10px] hover:bg-muted"
              >
                <span className={`rounded px-1 text-[9px] font-semibold uppercase ${ROLE_STYLE[u.role]}`}>{u.role}</span>
                <span className="font-mono">{u.email}</span>
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={login} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
            Sign in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
