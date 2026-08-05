/**
 * MCP (Model Context Protocol) Connectors — built-in.
 *
 * Each connector is a named bridge the swarm can invoke via a scoped tool
 * token of the form `mcp:<connectorId>`. They are declared (not all live-wired)
 * so the orchestrator can plan workflows that span external systems.
 */

export interface McpConnector {
  id: string
  name: string
  type: string
  description: string
  icon: string
  status: 'ready' | 'configured' | 'available'
  /** Skills that map onto this connector. */
  capabilities: string[]
}

export const MCP_CONNECTORS: McpConnector[] = [
  {
    id: 'filesystem',
    name: 'Filesystem',
    type: 'storage',
    description: 'Read/write files in the workspace sandbox.',
    icon: 'FolderTree',
    status: 'ready',
    capabilities: ['code.review', 'code.refactor', 'code.test-gen', 'docs.readme'],
  },
  {
    id: 'github',
    name: 'GitHub',
    type: 'vcs',
    description: 'Repos, issues, PRs, and commits via the GitHub API.',
    icon: 'Github',
    status: 'configured',
    capabilities: ['docs.changelog', 'docs.release-notes', 'ops.deploy'],
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    type: 'database',
    description: 'Query and migrate PostgreSQL databases.',
    icon: 'Database',
    status: 'available',
    capabilities: ['data.query-opt', 'data.migrate', 'data.schema-infer'],
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    type: 'database',
    description: 'Local SQLite store (the platform\'s own Prisma DB).',
    icon: 'Database',
    status: 'ready',
    capabilities: ['data.clean', 'data.profile', 'data.validate'],
  },
  {
    id: 'web-search',
    name: 'Web Search',
    type: 'web',
    description: 'Real-time web search via z-ai-web-dev-sdk.',
    icon: 'Search',
    status: 'ready',
    capabilities: ['research.web-search', 'research.compare', 'research.trend'],
  },
  {
    id: 'web-fetch',
    name: 'Web Fetch',
    type: 'web',
    description: 'Extract clean content from any URL.',
    icon: 'Globe',
    status: 'ready',
    capabilities: ['research.page-read', 'research.summarize', 'research.cite'],
  },
  {
    id: 'slack',
    name: 'Slack',
    type: 'messaging',
    description: 'Post messages and read channels.',
    icon: 'MessageSquare',
    status: 'available',
    capabilities: ['content.brief', 'ops.alert', 'ops.incident-triage'],
  },
  {
    id: 'email',
    name: 'Email',
    type: 'messaging',
    description: 'Send transactional email.',
    icon: 'Mail',
    status: 'available',
    capabilities: ['content.newsletter', 'content.press-release'],
  },
  {
    id: 'shell',
    name: 'Shell',
    type: 'system',
    description: 'Execute sandboxed shell commands.',
    icon: 'Terminal',
    status: 'configured',
    capabilities: ['ops.healthcheck', 'ops.log-tail', 'qa.lighthouse'],
  },
  {
    id: 'memory',
    name: 'Episodic Memory',
    type: 'memory',
    description: 'Shared cross-agent memory store.',
    icon: 'Brain',
    status: 'ready',
    capabilities: ['analysis.root-cause', 'analysis.gaps', 'research.timeline'],
  },
]

export const MCP_BY_ID: Record<string, McpConnector> = Object.fromEntries(
  MCP_CONNECTORS.map((c) => [c.id, c]),
)

export const MCP_COUNT = MCP_CONNECTORS.length
