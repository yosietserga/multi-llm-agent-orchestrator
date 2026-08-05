/**
 * Skills Registry — 100 "killer automagic" skills the swarm can invoke.
 *
 * Each skill is a named, categorized capability. Skills are scoped per-agent
 * (least-privilege). A subset is "invokable" (backed by a real implementation
 * via z-ai-web-dev-sdk or built-in tools); the rest are declarative
 * capabilities the orchestrator can plan around.
 */

export interface Skill {
  id: string
  name: string
  category: SkillCategory
  description: string
  invokable: boolean
  /** Built-in tool backing (if any): llm | web_search | page_reader | mcp:<connector> */
  tool?: string
}

export type SkillCategory =
  | 'code'
  | 'docs'
  | 'data'
  | 'research'
  | 'ops'
  | 'content'
  | 'analysis'
  | 'automation'
  | 'qa'

export const SKILL_CATEGORIES: { id: SkillCategory; label: string; accent: string }[] = [
  { id: 'code', label: 'Code', accent: 'emerald' },
  { id: 'docs', label: 'Docs', accent: 'sky' },
  { id: 'data', label: 'Data', accent: 'violet' },
  { id: 'research', label: 'Research', accent: 'amber' },
  { id: 'ops', label: 'Ops', accent: 'rose' },
  { id: 'content', label: 'Content', accent: 'cyan' },
  { id: 'analysis', label: 'Analysis', accent: 'orange' },
  { id: 'automation', label: 'Automation', accent: 'indigo' },
  { id: 'qa', label: 'QA', accent: 'teal' },
]

export const SKILLS: Skill[] = [
  // ── Code (15) ──────────────────────────────────────────────────────────────
  { id: 'code.review', name: 'Code Review', category: 'code', invokable: true, tool: 'llm', description: 'Review a diff or file for bugs, style, and best practices.' },
  { id: 'code.refactor', name: 'Refactor', category: 'code', invokable: true, tool: 'llm', description: 'Restructure code without changing behavior.' },
  { id: 'code.test-gen', name: 'Test Generation', category: 'code', invokable: true, tool: 'llm', description: 'Generate unit/integration tests for a module.' },
  { id: 'code.debug', name: 'Debug', category: 'code', invokable: true, tool: 'llm', description: 'Diagnose and propose fixes for a defect.' },
  { id: 'code.document', name: 'Document', category: 'code', invokable: true, tool: 'llm', description: 'Generate JSDoc/TSDoc for symbols.' },
  { id: 'code.lint-fix', name: 'Lint Fix', category: 'code', invokable: false, description: 'Auto-fix linting violations.' },
  { id: 'code.migrate', name: 'Migrate API', category: 'code', invokable: true, tool: 'llm', description: 'Migrate code across framework versions.' },
  { id: 'code.scaffold', name: 'Scaffold', category: 'code', invokable: false, description: 'Scaffold a new component or module.' },
  { id: 'code.optimize', name: 'Optimize', category: 'code', invokable: true, tool: 'llm', description: 'Optimize hot paths for performance.' },
  { id: 'code.typecheck', name: 'Typecheck', category: 'code', invokable: false, description: 'Run static type analysis.' },
  { id: 'code.security-scan', name: 'Security Scan', category: 'code', invokable: true, tool: 'llm', description: 'Scan for common vulnerability patterns.' },
  { id: 'code.deps-audit', name: 'Dependency Audit', category: 'code', invokable: false, description: 'Audit dependencies for CVEs and licenses.' },
  { id: 'code.api-design', name: 'API Design', category: 'code', invokable: true, tool: 'llm', description: 'Design a REST/GraphQL API surface.' },
  { id: 'code.schema-gen', name: 'Schema Gen', category: 'code', invokable: true, tool: 'llm', description: 'Generate Prisma/SQL schemas from specs.' },
  { id: 'code.snippet', name: 'Snippet', category: 'code', invokable: true, tool: 'llm', description: 'Produce a reusable code snippet.' },

  // ── Docs (12) ──────────────────────────────────────────────────────────────
  { id: 'docs.readme', name: 'README', category: 'docs', invokable: true, tool: 'llm', description: 'Generate a project README.' },
  { id: 'docs.changelog', name: 'Changelog', category: 'docs', invokable: true, tool: 'llm', description: 'Draft a changelog from commits.' },
  { id: 'docs.api-doc', name: 'API Docs', category: 'docs', invokable: true, tool: 'llm', description: 'Generate API reference documentation.' },
  { id: 'docs.architecture', name: 'Architecture', category: 'docs', invokable: true, tool: 'llm', description: 'Document system architecture.' },
  { id: 'docs.runbook', name: 'Runbook', category: 'docs', invokable: true, tool: 'llm', description: 'Produce an ops runbook.' },
  { id: 'docs.adr', name: 'ADR', category: 'docs', invokable: true, tool: 'llm', description: 'Write an Architecture Decision Record.' },
  { id: 'docs.tutorial', name: 'Tutorial', category: 'docs', invokable: true, tool: 'llm', description: 'Author a step-by-step tutorial.' },
  { id: 'docs.faq', name: 'FAQ', category: 'docs', invokable: true, tool: 'llm', description: 'Compile a FAQ from common questions.' },
  { id: 'docs.glossary', name: 'Glossary', category: 'docs', invokable: true, tool: 'llm', description: 'Build a domain glossary.' },
  { id: 'docs.release-notes', name: 'Release Notes', category: 'docs', invokable: true, tool: 'llm', description: 'Write release notes.' },
  { id: 'docs.man-page', name: 'Man Page', category: 'docs', invokable: true, tool: 'llm', description: 'Generate a CLI man page.' },
  { id: 'docs.spec', name: 'Spec', category: 'docs', invokable: true, tool: 'llm', description: 'Draft a technical specification.' },

  // ── Data (12) ──────────────────────────────────────────────────────────────
  { id: 'data.clean', name: 'Clean', category: 'data', invokable: true, tool: 'llm', description: 'Clean and normalize a dataset.' },
  { id: 'data.transform', name: 'Transform', category: 'data', invokable: true, tool: 'llm', description: 'Transform data between formats.' },
  { id: 'data.validate', name: 'Validate', category: 'data', invokable: true, tool: 'llm', description: 'Validate data against a schema.' },
  { id: 'data.schema-infer', name: 'Schema Infer', category: 'data', invokable: true, tool: 'llm', description: 'Infer a schema from sample data.' },
  { id: 'data.migrate', name: 'Migrate', category: 'data', invokable: true, tool: 'llm', description: 'Plan a data migration.' },
  { id: 'data.backup', name: 'Backup', category: 'data', invokable: false, description: 'Back up a datastore.' },
  { id: 'data.query-opt', name: 'Query Optimize', category: 'data', invokable: true, tool: 'llm', description: 'Optimize slow queries.' },
  { id: 'data.etl', name: 'ETL', category: 'data', invokable: true, tool: 'llm', description: 'Design an ETL pipeline.' },
  { id: 'data.dedupe', name: 'Dedupe', category: 'data', invokable: true, tool: 'llm', description: 'Deduplicate records.' },
  { id: 'data.anonymize', name: 'Anonymize', category: 'data', invokable: true, tool: 'llm', description: 'Anonymize PII in a dataset.' },
  { id: 'data.enrich', name: 'Enrich', category: 'data', invokable: true, tool: 'llm', description: 'Enrich records with external data.' },
  { id: 'data.profile', name: 'Profile', category: 'data', invokable: true, tool: 'llm', description: 'Profile a dataset statistics.' },

  // ── Research (12) ──────────────────────────────────────────────────────────
  { id: 'research.web-search', name: 'Web Search', category: 'research', invokable: true, tool: 'web_search', description: 'Search the web for real-time info.' },
  { id: 'research.page-read', name: 'Page Read', category: 'research', invokable: true, tool: 'page_reader', description: 'Extract content from a web page.' },
  { id: 'research.summarize', name: 'Summarize', category: 'research', invokable: true, tool: 'llm', description: 'Summarize long-form content.' },
  { id: 'research.compare', name: 'Compare', category: 'research', invokable: true, tool: 'llm', description: 'Compare options side-by-side.' },
  { id: 'research.cite', name: 'Cite', category: 'research', invokable: true, tool: 'llm', description: 'Produce citations for claims.' },
  { id: 'research.fact-check', name: 'Fact Check', category: 'research', invokable: true, tool: 'llm', description: 'Verify factual claims.' },
  { id: 'research.trend', name: 'Trend', category: 'research', invokable: true, tool: 'llm', description: 'Identify trends in a domain.' },
  { id: 'research.survey', name: 'Survey', category: 'research', invokable: true, tool: 'llm', description: 'Produce a literature survey.' },
  { id: 'research.benchmark', name: 'Benchmark', category: 'research', invokable: true, tool: 'llm', description: 'Benchmark tools/models.' },
  { id: 'research.source-rank', name: 'Source Rank', category: 'research', invokable: true, tool: 'llm', description: 'Rank sources by credibility.' },
  { id: 'research.timeline', name: 'Timeline', category: 'research', invokable: true, tool: 'llm', description: 'Build a timeline of events.' },
  { id: 'research.gaps', name: 'Gap Analysis', category: 'research', invokable: true, tool: 'llm', description: 'Identify research gaps.' },

  // ── Ops (12) ───────────────────────────────────────────────────────────────
  { id: 'ops.deploy', name: 'Deploy', category: 'ops', invokable: false, description: 'Deploy a service to an environment.' },
  { id: 'ops.rollback', name: 'Rollback', category: 'ops', invokable: false, description: 'Roll back a deployment.' },
  { id: 'ops.healthcheck', name: 'Healthcheck', category: 'ops', invokable: false, description: 'Run service healthchecks.' },
  { id: 'ops.log-tail', name: 'Log Tail', category: 'ops', invokable: false, description: 'Tail and filter logs.' },
  { id: 'ops.metrics', name: 'Metrics', category: 'ops', invokable: false, description: 'Pull and chart metrics.' },
  { id: 'ops.alert', name: 'Alert', category: 'ops', invokable: false, description: 'Configure alerting rules.' },
  { id: 'ops.scale', name: 'Scale', category: 'ops', invokable: false, description: 'Scale a service up/down.' },
  { id: 'ops.backup-verify', name: 'Backup Verify', category: 'ops', invokable: false, description: 'Verify backups are restorable.' },
  { id: 'ops.cert-renew', name: 'Cert Renew', category: 'ops', invokable: false, description: 'Renew TLS certificates.' },
  { id: 'ops.cron-audit', name: 'Cron Audit', category: 'ops', invokable: false, description: 'Audit scheduled jobs.' },
  { id: 'ops.secret-rotate', name: 'Secret Rotate', category: 'ops', invokable: false, description: 'Rotate secrets and keys.' },
  { id: 'ops.incident-triage', name: 'Incident Triage', category: 'ops', invokable: true, tool: 'llm', description: 'Triage an ongoing incident.' },

  // ── Content (10) ───────────────────────────────────────────────────────────
  { id: 'content.blog', name: 'Blog Post', category: 'content', invokable: true, tool: 'llm', description: 'Write a blog post.' },
  { id: 'content.newsletter', name: 'Newsletter', category: 'content', invokable: true, tool: 'llm', description: 'Compose a newsletter.' },
  { id: 'content.social', name: 'Social Post', category: 'content', invokable: true, tool: 'llm', description: 'Draft social media posts.' },
  { id: 'content.press-release', name: 'Press Release', category: 'content', invokable: true, tool: 'llm', description: 'Write a press release.' },
  { id: 'content.translation', name: 'Translation', category: 'content', invokable: true, tool: 'llm', description: 'Translate content.' },
  { id: 'content.transcript', name: 'Transcript', category: 'content', invokable: true, tool: 'llm', description: 'Transcribe audio/video.' },
  { id: 'content.caption', name: 'Caption', category: 'content', invokable: true, tool: 'llm', description: 'Generate captions.' },
  { id: 'content.brief', name: 'Summary Brief', category: 'content', invokable: true, tool: 'llm', description: 'Produce an exec brief.' },
  { id: 'content.outline', name: 'Outline', category: 'content', invokable: true, tool: 'llm', description: 'Build a content outline.' },
  { id: 'content.draft', name: 'Draft', category: 'content', invokable: true, tool: 'llm', description: 'Draft long-form content.' },

  // ── Analysis (10) ──────────────────────────────────────────────────────────
  { id: 'analysis.root-cause', name: 'Root Cause', category: 'analysis', invokable: true, tool: 'llm', description: 'Perform root-cause analysis.' },
  { id: 'analysis.risk', name: 'Risk Assess', category: 'analysis', invokable: true, tool: 'llm', description: 'Assess project risks.' },
  { id: 'analysis.cost', name: 'Cost Analyze', category: 'analysis', invokable: true, tool: 'llm', description: 'Analyze cloud costs.' },
  { id: 'analysis.perf', name: 'Perf Analyze', category: 'analysis', invokable: true, tool: 'llm', description: 'Analyze performance bottlenecks.' },
  { id: 'analysis.usage', name: 'Usage Analyze', category: 'analysis', invokable: true, tool: 'llm', description: 'Analyze product usage.' },
  { id: 'analysis.sentiment', name: 'Sentiment', category: 'analysis', invokable: true, tool: 'llm', description: 'Run sentiment analysis.' },
  { id: 'analysis.taxonomy', name: 'Taxonomy', category: 'analysis', invokable: true, tool: 'llm', description: 'Build a content taxonomy.' },
  { id: 'analysis.cohort', name: 'Cohort', category: 'analysis', invokable: true, tool: 'llm', description: 'Perform cohort analysis.' },
  { id: 'analysis.funnel', name: 'Funnel', category: 'analysis', invokable: true, tool: 'llm', description: 'Analyze conversion funnels.' },
  { id: 'analysis.forecast', name: 'Forecast', category: 'analysis', invokable: true, tool: 'llm', description: 'Produce a forecast.' },

  // ── Automation (10) ────────────────────────────────────────────────────────
  { id: 'auto.cron-gen', name: 'Cron Gen', category: 'automation', invokable: true, tool: 'llm', description: 'Generate cron expressions.' },
  { id: 'auto.workflow-build', name: 'Workflow Build', category: 'automation', invokable: true, tool: 'llm', description: 'Build an automation workflow.' },
  { id: 'auto.webhook', name: 'Webhook Setup', category: 'automation', invokable: false, description: 'Configure a webhook.' },
  { id: 'auto.api-integrate', name: 'API Integrate', category: 'automation', invokable: true, tool: 'llm', description: 'Integrate an external API.' },
  { id: 'auto.scraper', name: 'Scraper', category: 'automation', invokable: false, description: 'Build a web scraper.' },
  { id: 'auto.notifier', name: 'Notifier', category: 'automation', invokable: false, description: 'Set up notifications.' },
  { id: 'auto.batch', name: 'Batch Process', category: 'automation', invokable: false, description: 'Run a batch process.' },
  { id: 'auto.queue', name: 'Queue Manage', category: 'automation', invokable: false, description: 'Manage a job queue.' },
  { id: 'auto.state-machine', name: 'State Machine', category: 'automation', invokable: true, tool: 'llm', description: 'Design a state machine.' },
  { id: 'auto.pipeline', name: 'Pipeline', category: 'automation', invokable: true, tool: 'llm', description: 'Design a CI/CD pipeline.' },

  // ── QA (7) ─────────────────────────────────────────────────────────────────
  { id: 'qa.a11y', name: 'A11y Audit', category: 'qa', invokable: true, tool: 'llm', description: 'Audit accessibility.' },
  { id: 'qa.lighthouse', name: 'Lighthouse', category: 'qa', invokable: false, description: 'Run Lighthouse audits.' },
  { id: 'qa.cross-browser', name: 'Cross-Browser', category: 'qa', invokable: false, description: 'Cross-browser test.' },
  { id: 'qa.visual-regression', name: 'Visual Regression', category: 'qa', invokable: false, description: 'Visual regression test.' },
  { id: 'qa.load-test', name: 'Load Test', category: 'qa', invokable: false, description: 'Run load tests.' },
  { id: 'qa.fuzz', name: 'Fuzz', category: 'qa', invokable: true, tool: 'llm', description: 'Generate fuzz inputs.' },
  { id: 'qa.contract', name: 'Contract Test', category: 'qa', invokable: true, tool: 'llm', description: 'Generate contract tests.' },
]

export const SKILLS_BY_ID: Record<string, Skill> = Object.fromEntries(SKILLS.map((s) => [s.id, s]))

export function skillsByCategory(): Record<SkillCategory, Skill[]> {
  const out = {} as Record<SkillCategory, Skill[]>
  for (const cat of SKILL_CATEGORIES) out[cat.id] = []
  for (const s of SKILLS) out[s.category].push(s)
  return out
}

export const INVOKABLE_SKILLS = SKILLS.filter((s) => s.invokable)
export const SKILL_COUNT = SKILLS.length
