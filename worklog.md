# Project Worklog

---
Task ID: R52-multi-llm-orchestrator
Agent: Z.ai Code (main)
Task: Build a Multi-LLM Agent Orchestration dashboard (Next.js 16) realizing the Round 52 vision — parallel LLM agents (Qwen/GLM/Claude personas) working on different topics simultaneously in isolated "chat rooms", with a root index, shared episodic memory, circuit-breakers, typed schema contracts, and 9 research patterns + 10 killer features.

Work Log:
- Inspected the actual project state: `/home/z/my-project` is a fresh Next.js 16 + Tailwind 4 + shadcn/ui + Prisma (SQLite) project. The SAAS monorepo from the prior summary does NOT exist here — it was an external/audited codebase. Reinterpreted the Round 52 intent as a buildable Next.js app.
- Loaded the LLM skill; confirmed `z-ai-web-dev-sdk@0.0.18` supports `chat.completions.create({ messages, model?, stream?, thinking })` and built-in `functions.invoke('web_search' | 'page_reader')` (used for least-privilege tool scoping).
- Installed `socket.io` + `socket.io-client` (were missing).
- Prisma schema (`prisma/schema.prisma`): `AgentRoom`, `AgentMessage`, `Finding`, `EpisodicMemory` — pushed + generated.
- Shared lib (framework-agnostic so the mini-service could import it): `src/lib/agents/config.ts` (3 room seeds: Qwen→widgets, GLM→security, Claude→admin-app; `AgentOutputSchema` Zod contract; circuit thresholds; tool scopes) and `src/lib/types.ts` (socket wire types).
- API routes (Prisma-backed): `POST /api/seed` (idempotent upsert), `GET/POST /api/rooms`, `GET/PATCH /api/rooms/[id]`, `POST /api/rooms/[id]/messages` (bounded retention 200), `GET/POST /api/findings`, `GET/POST /api/memory` (bounded retention 500).
- Frontend (frontend-first so the user sees results): Zustand store (`src/lib/agents/store.ts`), socket hook (`use-agent-socket.ts`), and components — `agent-dashboard.tsx`, `agent-room-card.tsx`, `memory-timeline.tsx`, `dag-visualizer.tsx`, `schema-inspector.tsx`, `tool-scope-matrix.tsx`, `findings-table.tsx`. `page.tsx` renders `<AgentDashboard />`.
- Mini-service: created `mini-services/agent-service/` (package.json + index.ts) with full orchestration logic. Verified code runs cleanly in foreground. BUT the sandbox reaps background bun processes between tool calls (~60s) AND bun binds IPv4-only while the Caddy gateway connects via IPv6 `::1` → HTTP 502.
- Pivoted: hosted the socket.io server INSIDE the persistent Next.js dev process via `src/lib/agents/agent-server.ts` (globalThis guard, Node dual-stack `listen(3003)`, direct Prisma persistence). Bootstrapped via `GET /api/agent/bootstrap`. Kept the mini-service file as a documented reference.
- Fixed a Next.js routing gotcha: `_agent` is a private folder (excluded from routing) → renamed to `agent`.
- Agent Browser self-verification (via the gateway on port 81, the real preview path):
  - Page renders, no console/runtime errors, socket connects (`socket live`, Run buttons enabled).
  - "Run all in parallel" launches 3 agents via `Promise.all`; each calls z-ai-web-dev-sdk LLM, streams output, parses JSON (fence-stripping), validates against Zod schema (two-phase commit), commits findings, persists to Prisma, broadcasts memory events.
  - Verified real LLM output: Qwen → widget hydration/focus/overflow findings; GLM → security authz/memory/socket findings; Claude → admin-app findings. Findings + memory retrievable via `/api/findings` and `/api/memory`.
  - Single-room Reset + Run path verified.
  - Responsive: mobile (390px) → 1 column; desktop (1280px) → 3 columns (400px cards).
  - Sticky footer: root `min-h-screen flex-col`, footer at content bottom (pushed down naturally, no overlap).
  - Lint clean (`bun run lint` → 0 errors after ignoring the unrelated `analysis/` cloned repo).

Stage Summary:
- Delivered a working Multi-LLM Agent Orchestration dashboard at `/` (the only user-visible route).
- 9 research patterns implemented: Context Window Isolation, Typed Schema Contracts (Zod), Circuit-Breaker, Least-Privilege Tool Scoping, Two-Phase Commit, Parallel DAG, Test-First (schema visible in UI), Shared Episodic Memory, (Atomic isolation per room).
- 10 killer features surfaced in the UI: parallel agent grid, per-room streaming chat, shared memory timeline, circuit-breaker panel, findings index, DAG visualizer, schema inspector, tool-scope matrix, two-phase commit (validate→persist), run-all dispatcher.
- Architecture decision: socket.io runs in-process (Next.js dev process) instead of a standalone mini-service, due to (a) sandbox process-reaper killing background bun processes and (b) bun IPv4-only binding causing Caddy IPv6 502. Node dual-stack `listen(3003)` fixes both. Documented in `mini-services/agent-service/index.ts` header.
- Verified end-to-end in the browser: agents produce real, validated, persisted findings.
