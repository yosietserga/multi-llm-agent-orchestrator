/**
 * Multi-LLM Agent Orchestration — shared configuration.
 *
 * Framework-agnostic (only depends on `zod`) so it can be imported by both the
 * Next.js API routes AND the `mini-services/agent-service` bun process.
 *
 * This realizes the Round 52 vision: each room is an isolated "chat room" for
 * one LLM persona + topic, running in parallel without collisions.
 */
import { z } from 'zod'

export type LlmPersona = 'qwen' | 'glm' | 'claude'
export type ToolName = 'llm' | 'web_search' | 'page_reader'
export type RoomStatus = 'idle' | 'running' | 'done' | 'tripped' | 'error'

/** Typed Schema Contract — every agent must return this shape (Two-Phase Commit). */
export const AgentOutputSchema = z.object({
  summary: z.string().min(1).max(500),
  findings: z
    .array(
      z.object({
        severity: z.enum(['info', 'warn', 'critical']),
        title: z.string().min(1).max(140),
        detail: z.string().min(1).max(1200),
      }),
    )
    .min(1)
    .max(8),
})
export type AgentOutput = z.infer<typeof AgentOutputSchema>

export interface RoomConfig {
  id: string
  llm: LlmPersona
  topic: string
  title: string
  systemPrompt: string
  taskPrompt: string
  /** Least-privilege tool scoping — only these skills are available to this agent. */
  allowedTools: ToolName[]
  /** Human-readable description of the typed contract (shown in Schema Inspector). */
  contract: string
  accent: string // tailwind accent token for the persona
}

/**
 * The three parallel "chat rooms" — one per LLM persona + cold-run topic.
 * Case study: Qwen → widgets, GLM → security, Claude → admin-app.
 */
export const ROOM_CONFIG: RoomConfig[] = [
  {
    id: 'room-qwen-widgets',
    llm: 'qwen',
    topic: 'widgets-cold-run',
    title: 'Qwen · Widgets Cold Run',
    systemPrompt:
      'You are "Qwen", a meticulous frontend engineer specializing in widget ' +
      'libraries and design systems. You perform cold-run audits: you inspect a ' +
      'widget surface for rendering, hydration, a11y, and layout regressions. ' +
      'You are precise, cite component names, and never hallucinate files. ' +
      'Respond ONLY with compact JSON matching the contract.',
    taskPrompt:
      'Perform a widgets cold-run on a freshly mounted dashboard surface with ' +
      'Card, Button, Tabs, Dialog, ScrollArea and a chart grid. Identify the ' +
      'top 3 risks a cold run would surface (hydration mismatch, focus trap ' +
      'gaps, overflow). Produce 3 findings with severity and a one-line fix.',
    allowedTools: ['llm'],
    contract:
      '{ summary: string; findings: [{ severity: "info"|"warn"|"critical"; title: string; detail: string }] }',
    accent: 'emerald',
  },
  {
    id: 'room-glm-security',
    llm: 'glm',
    topic: 'security-cold-run',
    title: 'GLM · Security Cold Run',
    systemPrompt:
      'You are "GLM", an application security engineer. You perform cold-run ' +
      'security audits: auth boundaries, secret handling, input validation, ' +
      'rate-limiting, and injection surface. You reason adversarially but ' +
      'report constructively. Respond ONLY with compact JSON matching the contract.',
    taskPrompt:
      'Perform a security cold run on an API gateway exposing /api/rooms, ' +
      '/api/findings, /api/memory with socket.io on port 3003. Assume JWT auth ' +
      'and a Prisma SQLite store. Identify the top 3 cold-run security risks ' +
      '(missing authz on room read, unbounded memory writes, socket origin). ' +
      'Produce 3 findings with severity and a one-line remediation.',
    allowedTools: ['llm', 'web_search'],
    contract:
      '{ summary: string; findings: [{ severity: "info"|"warn"|"critical"; title: string; detail: string }] }',
    accent: 'rose',
  },
  {
    id: 'room-claude-admin',
    llm: 'claude',
    topic: 'admin-app-cold-run',
    title: 'Claude · Admin App Cold Run',
    systemPrompt:
      'You are "Claude", a senior full-stack architect. You perform cold-run ' +
      'reviews of admin applications: RBAC correctness, data-table ergonomics, ' +
      'optimistic UI, error boundaries, and audit logging. You favor concrete, ' +
      'shippable recommendations. Respond ONLY with compact JSON matching the contract.',
    taskPrompt:
      'Perform an admin-app cold run on a dashboard with role-based access ' +
      '(admin/operator/viewer), a findings table, a memory timeline, and a DAG ' +
      'visualizer. Identify the top 3 cold-run UX/arch risks (role-gated ' +
      'actions, table virtualization, stale memory). Produce 3 findings with ' +
      'severity and a one-line recommendation.',
    allowedTools: ['llm', 'web_search', 'page_reader'],
    contract:
      '{ summary: string; findings: [{ severity: "info"|"warn"|"critical"; title: string; detail: string }] }',
    accent: 'violet',
  },
]

export const ROOM_BY_ID = Object.fromEntries(ROOM_CONFIG.map((r) => [r.id, r]))

/** Circuit-breaker thresholds (per room). */
export const CIRCUIT_FAILURE_THRESHOLD = 3
export const CIRCUIT_RESET_MS = 30_000

/** Simulated streaming chunk size (ms between emits) for the live UX. */
export const STREAM_CHUNK_MS = 18
export const STREAM_CHUNK_CHARS = 12

/** All skills the orchestrator can scope (for the Tool-Scope Matrix). */
export const ALL_TOOLS: ToolName[] = ['llm', 'web_search', 'page_reader']
