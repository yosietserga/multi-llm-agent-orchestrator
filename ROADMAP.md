# 🗺️ Roadmap — AIgent Swarm

## ✅ v1.0 (current — launch-ready)
- [x] 8 views (Swarm, Kanban, Gantt, Chat, Skills, MCP, Endpoints, Reports)
- [x] 100 skills registry (9 categories, 75 invokable)
- [x] 10 MCP connectors (built-in)
- [x] 6 LLM models (GLM, DeepSeek, Claude, GPT-4o, Gemini, Qwen)
- [x] GLM-only self-demo (orchestrator → agents → subagents)
- [x] Zod typed schema contracts + two-phase commit
- [x] Circuit-breaker per agent
- [x] NextAuth.js auth with 3 roles (admin/operator/viewer)
- [x] Custom LLM endpoint CRUD (OpenAI/Anthropic-compatible)
- [x] Versioned reports with model specs
- [x] Docker Compose + Dockerfile
- [x] Deploy configs (Vercel, Railway, Render)
- [x] Responsive (mobile + desktop)
- [x] Sticky footer + accessible (ARIA, keyboard nav)

## 🔜 v1.1 (month 1 post-launch)
- [ ] Real OAuth providers (GitHub, Google) alongside credentials
- [ ] PostgreSQL adapter (swap SQLite for production)
- [ ] WebSocket externalization (standalone socket.io service for horizontal scaling)
- [ ] Custom skill builder UI (let users add their own skills)
- [ ] Workflow templates (pre-built agent chains)
- [ ] Export reports as PDF/Markdown

## 🔮 v1.2 (month 2-3)
- [ ] Agent marketplace (share/sell skill packs)
- [ ] Multi-tenant workspaces
- [ ] Audit log with immutable append-only store
- [ ] Rate-limiting dashboard (per-endpoint, per-user)
- [ ] Webhook triggers (incoming + outgoing)
- [ ] Scheduled agent runs (cron)

## 🌟 v2.0 (Q2)
- [ ] Visual workflow builder (drag-and-drop, like n8n)
- [ ] Agent fine-tuning integration (OpenAI, Anthropic)
- [ ] RAG pipeline builder (vector DB + embeddings)
- [ ] Mobile app (React Native, share the same API)
- [ ] Plugin system (third-party MCP connectors)
- [ ] White-label mode (custom branding, custom domain)

---

## 📊 Update cadence
- **Monthly**: bug fixes + small features (free for all license holders)
- **Quarterly**: major features (free for Extended + Enterprise)
- **Roadmap-driven**: features prioritized by customer votes (GitHub Issues with 👍)

---

## 🗳️ Vote for features
Open an issue on [GitHub](https://github.com/yosietserga/multi-llm-agent-orchestrator/issues) with the `feature-request` label. The most 👍'd requests get prioritized.
