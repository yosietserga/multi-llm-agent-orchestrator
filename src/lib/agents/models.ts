/**
 * LLM Model Registry — updated from OpenRouter (https://openrouter.ai/models).
 *
 * 338 models available on OpenRouter; this registry includes the flagship from
 * each major provider + GLM-4-Plus (the demo model, invokable via z-ai-web-dev-sdk).
 *
 * Every log, finding, and report is tagged with { provider, model, version }.
 * Source: OpenRouter API (https://openrouter.ai/api/v1/models) — 338 models.
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
  /** OpenRouter model id (for custom endpoint routing). */
  openrouterId?: string
  /** Prompt price per token (USD). */
  pricePerToken?: number
}

export const LLM_REGISTRY: LlmModelSpec[] = [
  // ── GLM (demo model — invokable via z-ai-web-dev-sdk) ──────────────────────
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
  // ── OpenAI (from OpenRouter) ───────────────────────────────────────────────
  {
    id: 'gpt-5.6-luna-pro',
    name: 'GPT-5.6 Luna Pro',
    provider: 'openai',
    vendor: 'OpenAI',
    version: 'gpt-5.6-luna-pro@2026',
    contextWindow: 1_050_000,
    modalities: ['text', 'vision', 'audio'],
    strengths: ['multimodal', 'function calling', '1M context', 'flagship'],
    accent: 'violet',
    invokable: false,
    openrouterId: 'openai/gpt-5.6-luna-pro',
    pricePerToken: 0.0000001,
  },
  {
    id: 'gpt-5.6-luna',
    name: 'GPT-5.6 Luna',
    provider: 'openai',
    vendor: 'OpenAI',
    version: 'gpt-5.6-luna@2026',
    contextWindow: 1_050_000,
    modalities: ['text', 'vision'],
    strengths: ['multimodal', 'fast', 'cost-efficient'],
    accent: 'violet',
    invokable: false,
    openrouterId: 'openai/gpt-5.6-luna',
    pricePerToken: 0.0000001,
  },
  // ── Anthropic (from OpenRouter) ────────────────────────────────────────────
  {
    id: 'claude-opus-5',
    name: 'Claude Opus 5',
    provider: 'anthropic',
    vendor: 'Anthropic',
    version: 'claude-opus-5@2026',
    contextWindow: 1_000_000,
    modalities: ['text', 'vision'],
    strengths: ['deep reasoning', 'coding', '1M context', 'safety'],
    accent: 'amber',
    invokable: false,
    openrouterId: 'anthropic/claude-opus-5',
    pricePerToken: 0.000005,
  },
  {
    id: 'claude-opus-5-fast',
    name: 'Claude Opus 5 (Fast)',
    provider: 'anthropic',
    vendor: 'Anthropic',
    version: 'claude-opus-5-fast@2026',
    contextWindow: 1_000_000,
    modalities: ['text', 'vision'],
    strengths: ['fast reasoning', 'low latency', '1M context'],
    accent: 'amber',
    invokable: false,
    openrouterId: 'anthropic/claude-opus-5-fast',
    pricePerToken: 0.00001,
  },
  // ── Google (from OpenRouter) ───────────────────────────────────────────────
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    provider: 'google',
    vendor: 'Google',
    version: 'gemini-3.6-flash@2026',
    contextWindow: 1_048_576,
    modalities: ['text', 'vision', 'audio', 'video'],
    strengths: ['ultra-fast', 'multimodal', '1M context', 'video understanding'],
    accent: 'rose',
    invokable: false,
    openrouterId: 'google/gemini-3.6-flash',
    pricePerToken: 0.0000015,
  },
  // ── DeepSeek (from OpenRouter) ─────────────────────────────────────────────
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    provider: 'deepseek',
    vendor: 'DeepSeek',
    version: 'deepseek-v4-pro@2026',
    contextWindow: 1_048_576,
    modalities: ['text'],
    strengths: ['code generation', 'math reasoning', '1M context', 'MTP'],
    accent: 'sky',
    invokable: false,
    openrouterId: 'deepseek/deepseek-v4-pro',
    pricePerToken: 0.000000435,
  },
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    provider: 'deepseek',
    vendor: 'DeepSeek',
    version: 'deepseek-v4-flash@2026',
    contextWindow: 1_048_576,
    modalities: ['text'],
    strengths: ['ultra-cheap', 'fast', 'code', '1M context'],
    accent: 'sky',
    invokable: false,
    openrouterId: 'deepseek/deepseek-v4-flash-0731',
    pricePerToken: 0.00000009,
  },
  // ── Meta Llama (from OpenRouter) ───────────────────────────────────────────
  {
    id: 'llama-4-scout',
    name: 'Llama 4 Scout',
    provider: 'meta-llama',
    vendor: 'Meta',
    version: 'llama-4-scout@2026',
    contextWindow: 1_310_720,
    modalities: ['text', 'vision'],
    strengths: ['open-weight', '1.3M context', 'multimodal', 'self-hostable'],
    accent: 'orange',
    invokable: false,
    openrouterId: 'meta-llama/llama-4-scout',
    pricePerToken: 0.0000001,
  },
  // ── Qwen (from OpenRouter) ─────────────────────────────────────────────────
  {
    id: 'qwen3.8-max',
    name: 'Qwen3.8 Max',
    provider: 'qwen',
    vendor: 'Alibaba Cloud',
    version: 'qwen3.8-max@2026',
    contextWindow: 1_000_000,
    modalities: ['text', 'vision'],
    strengths: ['multilingual', 'code', 'tool use', '1M context'],
    accent: 'cyan',
    invokable: false,
    openrouterId: 'qwen/qwen3.8-max',
    pricePerToken: 0.000002,
  },
  // ── Mistral (from OpenRouter) ──────────────────────────────────────────────
  {
    id: 'mistral-medium-3.5',
    name: 'Mistral Medium 3.5',
    provider: 'mistralai',
    vendor: 'Mistral AI',
    version: 'mistral-medium-3.5@2026',
    contextWindow: 262_144,
    modalities: ['text', 'vision'],
    strengths: ['efficient', 'European', 'function calling', '262k context'],
    accent: 'indigo',
    invokable: false,
    openrouterId: 'mistralai/mistral-medium-3-5',
    pricePerToken: 0.0000015,
  },
  // ── xAI Grok (from OpenRouter) ─────────────────────────────────────────────
  {
    id: 'grok-4.20',
    name: 'Grok 4.20',
    provider: 'x-ai',
    vendor: 'xAI',
    version: 'grok-4.20@2026',
    contextWindow: 2_000_000,
    modalities: ['text', 'vision'],
    strengths: ['2M context', 'real-time', 'multi-agent', 'humor'],
    accent: 'teal',
    invokable: false,
    openrouterId: 'x-ai/grok-4.20',
    pricePerToken: 0.00000125,
  },
  // ── Cohere (from OpenRouter) ───────────────────────────────────────────────
  {
    id: 'command-a',
    name: 'Command A',
    provider: 'cohere',
    vendor: 'Cohere',
    version: 'command-a@2026',
    contextWindow: 256_000,
    modalities: ['text'],
    strengths: ['RAG', 'enterprise', 'citations', 'multilingual'],
    accent: 'fuchsia',
    invokable: false,
    openrouterId: 'cohere/command-a',
    pricePerToken: 0.0000025,
  },
]

export const LLM_BY_ID: Record<string, LlmModelSpec> = Object.fromEntries(
  LLM_REGISTRY.map((m) => [m.id, m]),
)

/** The default model for the self-demo (GLM-only, per user request). */
export const DEMO_MODEL_ID = 'glm-4-plus'

/** Total models available on OpenRouter (for display). */
export const OPENROUTER_TOTAL_MODELS = 338
