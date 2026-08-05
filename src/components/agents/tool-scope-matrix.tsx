'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Minus } from 'lucide-react'
import { useAgentStore } from '@/lib/agents/store'
import { ALL_TOOLS, type ToolName } from '@/lib/agents/config'

/**
 * Tool-Scope Matrix — shows which skills each agent is permitted to use.
 * Realizes the Least-Privilege Tool Scoping research pattern.
 */
export function ToolScopeMatrix() {
  const rooms = useAgentStore((s) => s.rooms)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Tool-Scope Matrix</CardTitle>
        <p className="text-xs text-muted-foreground">least-privilege: each agent can only invoke its permitted skills.</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">agent</th>
                {ALL_TOOLS.map((t) => (
                  <th key={t} className="pb-2 px-2 text-center font-mono font-medium">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    <div className="font-medium leading-tight">{r.llm}</div>
                    <div className="text-xs text-muted-foreground">{r.topic}</div>
                  </td>
                  {ALL_TOOLS.map((t: ToolName) => {
                    const allowed = r.allowedTools.includes(t)
                    return (
                      <td key={t} className="px-2 text-center">
                        {allowed ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            <Check className="h-3 w-3" />
                          </span>
                        ) : (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Minus className="h-3 w-3" />
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
