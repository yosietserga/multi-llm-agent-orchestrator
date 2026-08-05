'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sparkles, Check, Search } from 'lucide-react'
import { SKILLS, SKILL_CATEGORIES, type SkillCategory } from '@/lib/agents/skills'

const CAT_ACCENT: Record<SkillCategory, string> = {
  code: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  docs: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  data: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  research: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  ops: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  content: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  analysis: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  automation: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  qa: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
}

export function SkillsView() {
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState<SkillCategory | 'all'>('all')

  const filtered = useMemo(() => {
    return SKILLS.filter((s) => {
      if (activeCat !== 'all' && s.category !== activeCat) return false
      if (query) {
        const q = query.toLowerCase()
        return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.id.includes(q)
      }
      return true
    })
  }, [query, activeCat])

  const invokableCount = SKILLS.filter((s) => s.invokable).length

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" /> Skills Registry
          <Badge variant="outline" className="ml-auto">{SKILLS.length} skills</Badge>
          <Badge variant="secondary" className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            <Check className="h-3 w-3" /> {invokableCount} invokable
          </Badge>
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search 100 skills…"
              className="h-9 pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setActiveCat('all')}
              className={`rounded-md border px-2 py-1 text-xs ${activeCat === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              all
            </button>
            {SKILL_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`rounded-md border px-2 py-1 text-xs ${activeCat === c.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[560px] pr-3" style={{ scrollbarWidth: 'thin' }}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <div key={s.id} className="rounded-md border p-2.5">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={`text-[9px] uppercase ${CAT_ACCENT[s.category]}`}>{s.category}</Badge>
                  {s.invokable ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                      <Check className="h-2.5 w-2.5" /> invokable
                    </span>
                  ) : (
                    <span className="text-[9px] text-muted-foreground">declarative</span>
                  )}
                </div>
                <p className="mt-1 text-sm font-medium leading-tight">{s.name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <code className="font-mono text-[9px] text-muted-foreground">{s.id}</code>
                  {s.tool && <code className="font-mono text-[9px] text-muted-foreground">→ {s.tool}</code>}
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && <p className="py-10 text-center text-sm italic text-muted-foreground">no skills match "{query}"</p>}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
