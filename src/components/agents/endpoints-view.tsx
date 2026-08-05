'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Server, Plus, Trash2, Pencil } from 'lucide-react'
import { useSwarmStore } from '@/lib/agents/store'
import type { LlmEndpointRow } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

interface FormState {
  name: string
  provider: string
  baseUrl: string
  apiKey: string
  model: string
  active: boolean
}

const EMPTY: FormState = { name: '', provider: 'openai', baseUrl: '', apiKey: '', model: '', active: true }

export function EndpointsView() {
  const endpoints = useSwarmStore((s) => s.endpoints)
  const setEndpoints = useSwarmStore((s) => s.setEndpoints)
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [editingId, setEditingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/endpoints')
      const json = await res.json()
      if (Array.isArray(json.endpoints)) setEndpoints(json.endpoints)
    } catch {
      /* ignore */
    }
  }, [setEndpoints])

  // Endpoints are already loaded via bootstrap-data into the store.
  // Only fetch if the store is empty (e.g. user navigated directly to this view
  // after a page refresh that cleared the store).
  useEffect(() => {
    if (endpoints.length === 0) refresh()
  }, [refresh, endpoints.length])

  async function submit() {
    if (!form.name || !form.baseUrl || !form.model) {
      toast({ title: 'Missing fields', description: 'name, baseUrl, and model are required', variant: 'destructive' })
      return
    }
    try {
      const url = editingId ? `/api/endpoints/${editingId}` : '/api/endpoints'
      const method = editingId ? 'PATCH' : 'POST'
      await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      toast({ title: editingId ? 'Endpoint updated' : 'Endpoint created' })
      setOpen(false)
      setForm(EMPTY)
      setEditingId(null)
      await refresh()
    } catch (err) {
      toast({ title: 'Save failed', description: err instanceof Error ? err.message : '', variant: 'destructive' })
    }
  }

  async function remove(id: string) {
    try {
      await fetch(`/api/endpoints/${id}`, { method: 'DELETE' })
      toast({ title: 'Endpoint deleted' })
      await refresh()
    } catch {
      /* ignore */
    }
  }

  function startEdit(e: LlmEndpointRow) {
    setEditingId(e.id)
    setForm({ name: e.name, provider: e.provider, baseUrl: e.baseUrl, apiKey: '', model: e.model, active: e.active })
    setOpen(true)
  }

  function startCreate() {
    setEditingId(null)
    setForm(EMPTY)
    setOpen(true)
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Server className="h-4 w-4" /> Custom LLM Endpoints
          <Badge variant="outline" className="ml-auto">{endpoints.length}</Badge>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={startCreate} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> New endpoint
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit endpoint' : 'New OpenAI/Anthropic-compatible endpoint'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="ep-name">Name</Label>
                  <Input id="ep-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My GPT-4o proxy" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Provider</Label>
                    <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">openai</SelectItem>
                        <SelectItem value="anthropic">anthropic</SelectItem>
                        <SelectItem value="deepseek">deepseek</SelectItem>
                        <SelectItem value="google">google</SelectItem>
                        <SelectItem value="custom">custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Model</Label>
                    <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="gpt-4o / claude-3-5-sonnet" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Base URL</Label>
                  <Input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://api.openai.com/v1" />
                </div>
                <div className="space-y-1">
                  <Label>API Key</Label>
                  <Input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder={editingId ? '•••••••• (leave blank to keep)' : 'sk-…'} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  <Label>Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit}>{editingId ? 'Save' : 'Create'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {endpoints.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
            <Server className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No custom endpoints yet.</p>
            <p className="text-xs text-muted-foreground">Add OpenAI or Anthropic-compatible endpoints (base URL + key + model).</p>
          </div>
        ) : (
          <ScrollArea className="h-[560px] pr-3" style={{ scrollbarWidth: 'thin' }}>
            <div className="space-y-2">
              {endpoints.map((e) => (
                <div key={e.id} className="rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{e.name}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">{e.provider}</Badge>
                    {e.active ? (
                      <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">active</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">inactive</Badge>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(e)} className="h-7 gap-1">
                        <Pencil className="h-3 w-3" /> edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(e.id)} className="h-7 text-red-600">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-1.5 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <span><span className="font-medium">base:</span> <code className="font-mono">{e.baseUrl}</code></span>
                    <span><span className="font-medium">model:</span> <code className="font-mono">{e.model}</code></span>
                    {e.apiKeyMasked && <span><span className="font-medium">key:</span> <code className="font-mono">{e.apiKeyMasked}</code></span>}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
