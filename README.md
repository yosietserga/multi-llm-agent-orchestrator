# 🤖 AIgent Swarm — Multi-LLM Agent Orchestration Platform

> The all-in-one platform to build, visualize, and orchestrate AI agent swarms. 13 LLMs · 100 skills · 10 MCP connectors · 8 professional views.

> ⚠️ **One-click deploy requires a public repo.** This repo is currently private — either make it public in GitHub settings, or fork/clone it to a public repo first, then use the buttons below with your own URL.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new?githubUrl=https://github.com/yosietserga/multi-llm-agent-orchestrator)
[![Deploy on Render](https://render.com/images/deploy-render.svg)](https://render.com/deploy?repo=https://github.com/yosietserga/multi-llm-agent-orchestrator)
[![Deploy on Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/yosietserga/multi-llm-agent-orchestrator)

---

## 🎬 Live Demo

Launch the **GLM-only self-demo** from the header → watch an orchestrator dispatch 4 parallel agents + 2 subagents → inspect the versioned report with model specs.

**Demo accounts** (auto-seeded):
| Role | Email | Password | Access |
|------|-------|----------|--------|
| 🔴 Admin | `admin@swarm.dev` | `admin123` | Full: endpoints CRUD, delete, demos |
| 🔵 Operator | `operator@swarm.dev` | `operator123` | Run demos, read endpoints |
| ⚪ Viewer | `viewer@swarm.dev` | `viewer123` | Read-only |

---

## ✨ Features

### 8 Professional Views
| View | Description |
|------|-------------|
| 🌀 **Swarm Workflow** | n8n-style animated DAG — orchestrator → agents → subagents with live data-flow edges |
| 📋 **Kanban** | 5-column board (Backlog → Queued → Running → Done → Blocked) |
| 📊 **Gantt** | Timeline with task bars + live "now" marker |
| 💬 **Chat Rooms** | Per-LLM streaming chat with circuit-breaker status |
| ✨ **Skills** | 100 skills across 9 categories (75 invokable) |
| 🔌 **MCP Connectors** | 10 built-in Model Context Protocol bridges |
| 🖥️ **Endpoints** | CRUD for custom OpenAI/Anthropic-compatible endpoints |
| 📄 **Reports** | Versioned reports tagged with LLM model specs |

### 6 LLM Models (incl. DeepSeek)
| Model | Provider | Context | Strengths |
|-------|----------|---------|-----------|
| GLM-4-Plus | Z.ai | 128k | agentic reasoning, tool use |
| DeepSeek-V3 | DeepSeek | 64k | code, math, cost efficiency |
| Claude 3.5 Sonnet | Anthropic | 200k | reasoning, coding, safety |
| GPT-4o | OpenAI | 128k | multimodal, function calling |
| Gemini 1.5 Pro | Google | 2M | ultra-long context |
| Qwen2.5-Max | Alibaba | 131k | multilingual, tool use |

### 9 Research Patterns Implemented
Context Window Isolation · Typed Schema Contracts (Zod) · Circuit-Breaker · Least-Privilege Tool Scoping · Two-Phase Commit · Parallel DAG · Shared Episodic Memory · Test-First · Atomic Isolation

---

## 🚀 Quick Start

### Option 1: Local Development
```bash
git clone https://github.com/yosietserga/multi-llm-agent-orchestrator.git
cd multi-llm-agent-orchestrator
bun install
cp .env.example .env
bun run db:push
bun run dev
```
Open `http://localhost:3000` → click **Sign in** → use a demo account.

### Option 2: Docker Compose (one command)
```bash
git clone https://github.com/yosietserga/multi-llm-agent-orchestrator.git
cd multi-llm-agent-orchestrator
cp .env.example .env  # edit NEXTAUTH_SECRET
docker compose up
```
Open `http://localhost:81`.

### Option 3: One-Click Deploy
> **Note:** One-click deploy requires a **public** GitHub repo. If this repo is private, make it public first (or fork it), then click the buttons.
- **Railway**: [![Railway](https://railway.app/button.svg)](https://railway.app/new?githubUrl=https://github.com/yosietserga/multi-llm-agent-orchestrator)
- **Render**: [![Render](https://render.com/images/deploy-render.svg)](https://render.com/deploy?repo=https://github.com/yosietserga/multi-llm-agent-orchestrator)
- **Vercel** (REST only, no WebSocket): [![Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https://github.com/yosietserga/multi-llm-agent-orchestrator)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Database | Prisma ORM + SQLite (swap for PostgreSQL in production) |
| Real-time | socket.io (in-process, Node dual-stack) |
| AI | z-ai-web-dev-sdk (GLM-4-Plus) |
| Auth | NextAuth.js v4 (credentials + roles) |
| State | Zustand (client) + TanStack Query (server) |
| Validation | Zod (typed schema contracts) |

---

## 📦 What's Included

- ✅ Full Next.js 16 app (8 views, all responsive)
- ✅ Prisma schema (User, AgentTask, LlmEndpoint, Report, Finding, Memory)
- ✅ socket.io orchestration server (parallel agents + subagents)
- ✅ NextAuth.js auth with 3 roles (admin/operator/viewer)
- ✅ 100 skills registry (9 categories)
- ✅ 10 MCP connectors (built-in)
- ✅ 13 LLM models registry (incl. DeepSeek)
- ✅ Custom LLM endpoint CRUD (OpenAI/Anthropic-compatible)
- ✅ Zod typed schema contracts + two-phase commit
- ✅ Circuit-breaker per agent
- ✅ Versioned reports with model specs
- ✅ Docker Compose + Dockerfile
- ✅ Deploy configs (Vercel, Railway, Render)
- ✅ `.env.example` with all variables documented

---

## 📄 License

MIT — use it in unlimited projects. For white-label / Enterprise, see `LISTING.md`.

---

## 🔗 Links

- **Live Demo**: [preview panel]
- **Documentation**: see `docs/` folder
- **Issues**: [GitHub Issues](https://github.com/yosietserga/multi-llm-agent-orchestrator/issues)
- **Author**: [@yosietserga](https://github.com/yosietserga)
