/**
 * LLM Model Registry — the top LLMs available in the swarm.
 *
 * The self-demo runs ONLY on GLM (via z-ai-web-dev-sdk), as requested.
 * The other models are selectable in the UI and reachable via custom
 * OpenAI/Anthropic-compatible endpoints (see LlmEndpoint CRUD).
 *
 * Every log, finding, and report is tagged with { provider, model, version }.
 */

export interface LlmModelSpec {
  id: string
  name: string
  provider: string
  vendor: string
  version: string
  contextWindow: number // tokens
  modalities: string[]
  strengths: string[]
  accent: string
  /** Whether this model is actually invokable in-process (vs. needs a custom endpoint). */
  invokable: boolean
  /** The z-ai model id, if provider === 'z-ai'. */
  zaiModel?: string
}

export const LLM_REGISTRY: LlmModelSpec[] = [
  {
    id: 'glm-4-plus',
    name: 'GLM-4-Plus',
    provider: 'z-ai',
    vendor: 'Z.ai',
    version: 'glm-4-plus@2025-01',
    contextWindow: 128_000,
    modalities: ['text', 'vision'],
    strengths: ['agentic reasoning', 'tool use', 'long context', 'multi-turn'],
    accent: 'emerald',
    invokable: true,
    zaiModel: 'glm-4-plus',
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek-V3',
    provider: 'deepseek',
    vendor: 'DeepSeek',
    version: 'deepseek-v3@2024-12',
    contextWindow: 64_000,
    modalities: ['text'],
    strengths: ['code generation', 'math reasoning', 'cost efficiency', 'MTP'],
    accent: 'sky',
    invokable: false,
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    vendor: 'Anthropic',
    version: 'claude-3-5-sonnet@2024-10',
    contextWindow: 200_000,
    modalities: ['text', 'vision'],
    strengths: ['reasoning', 'coding', 'long-doc analysis', 'safety'],
    accent: 'amber',
    invokable: false,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    vendor: 'OpenAI',
    version: 'gpt-4o@2024-08',
    contextWindow: 128_000,
    modalities: ['text', 'vision', 'audio'],
    strengths: ['multimodal', 'function calling', 'speed', 'ecosystem'],
    accent: 'violet',
    invokable: false,
  },
  {
    id: 'gemini-1-5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    vendor: 'Google',
    version: 'gemini-1.5-pro@2024-09',
    contextWindow: 2_000_000,
    modalities: ['text', 'vision', 'audio', 'video'],
    strengths: ['ultra-long context', 'multimodal', 'video understanding'],
    accent: 'rose',
    invokable: false,
  },
  {
    id: 'qwen-2-5-max',
    name: 'Qwen2.5-Max',
    provider: 'alibaba',
    vendor: 'Alibaba Cloud',
    version: 'qwen2.5-max@2025-01',
    contextWindow: 131_072,
    modalities: ['text', 'vision'],
    strengths: ['multilingual', 'code', 'tool use', 'long context'],
    accent: 'cyan',
    invokable: false,
  },
]

export const LLM_BY_ID: Record<string, LlmModelSpec> = Object.fromEntries(
  LLM_REGISTRY.map((m) => [m.id, m]),
)

/** The default model for the self-demo (GLM-only, per user request). */
export const DEMO_MODEL_ID = 'glm-4-plus'
