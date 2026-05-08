import type { ProviderId } from '../schema/openclaw.schema.js';

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  description: string;
  baseUrl?: string;
  type: 'openai-compatible' | 'native';
  defaultModel: string;
  modelsEndpoint?: string;
  isDefault?: boolean;
  docsUrl: string;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'tensorix',
    label: 'Tensorix',
    description: 'Default. Unified OpenAI-compatible gateway with curated open-weights and proprietary models.',
    baseUrl: 'https://api.tensorix.ai/v1',
    modelsEndpoint: 'https://api.tensorix.ai/v1/models',
    type: 'openai-compatible',
    defaultModel: 'tensorix/glm-4.6',
    isDefault: true,
    docsUrl: 'https://docs.tensorix.ai',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: 'Claude Opus, Sonnet, Haiku — top-tier reasoning and tool use.',
    type: 'native',
    defaultModel: 'anthropic/claude-opus-4-7',
    docsUrl: 'https://docs.anthropic.com',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT family + o-series reasoning models.',
    baseUrl: 'https://api.openai.com/v1',
    modelsEndpoint: 'https://api.openai.com/v1/models',
    type: 'openai-compatible',
    defaultModel: 'openai/gpt-4o',
    docsUrl: 'https://platform.openai.com/docs',
  },
  {
    id: 'google',
    label: 'Google Gemini',
    description: 'Gemini Pro / Flash — strong multimodal and long context.',
    type: 'native',
    defaultModel: 'google/gemini-2.5-pro',
    docsUrl: 'https://ai.google.dev',
  },
  {
    id: 'mistral',
    label: 'Mistral',
    description: 'Mistral Large, Codestral and embedding models.',
    baseUrl: 'https://api.mistral.ai/v1',
    modelsEndpoint: 'https://api.mistral.ai/v1/models',
    type: 'openai-compatible',
    defaultModel: 'mistral/mistral-large-latest',
    docsUrl: 'https://docs.mistral.ai',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    description: 'DeepSeek-V3, DeepSeek-R1 reasoning model.',
    baseUrl: 'https://api.deepseek.com/v1',
    modelsEndpoint: 'https://api.deepseek.com/v1/models',
    type: 'openai-compatible',
    defaultModel: 'deepseek/deepseek-chat',
    docsUrl: 'https://api-docs.deepseek.com',
  },
  {
    id: 'groq',
    label: 'Groq',
    description: 'Ultra-low-latency inference for Llama, Mixtral, Qwen.',
    baseUrl: 'https://api.groq.com/openai/v1',
    modelsEndpoint: 'https://api.groq.com/openai/v1/models',
    type: 'openai-compatible',
    defaultModel: 'groq/llama-3.3-70b-versatile',
    docsUrl: 'https://console.groq.com/docs',
  },
  {
    id: 'together',
    label: 'Together AI',
    description: 'Hosted open-weights models with OpenAI compatibility.',
    baseUrl: 'https://api.together.xyz/v1',
    modelsEndpoint: 'https://api.together.xyz/v1/models',
    type: 'openai-compatible',
    defaultModel: 'together/meta-llama/Llama-3.3-70B-Instruct-Turbo',
    docsUrl: 'https://docs.together.ai',
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    description: 'Search-grounded LLMs (sonar family).',
    baseUrl: 'https://api.perplexity.ai',
    type: 'openai-compatible',
    defaultModel: 'perplexity/sonar-pro',
    docsUrl: 'https://docs.perplexity.ai',
  },
  {
    id: 'xai',
    label: 'xAI',
    description: 'Grok family.',
    baseUrl: 'https://api.x.ai/v1',
    modelsEndpoint: 'https://api.x.ai/v1/models',
    type: 'openai-compatible',
    defaultModel: 'xai/grok-2',
    docsUrl: 'https://docs.x.ai',
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    description: 'Run open models locally; no API key required.',
    baseUrl: 'http://localhost:11434/v1',
    modelsEndpoint: 'http://localhost:11434/v1/models',
    type: 'openai-compatible',
    defaultModel: 'ollama/llama3.2',
    docsUrl: 'https://ollama.com',
  },
  {
    id: 'lmstudio',
    label: 'LM Studio (local)',
    description: 'Local desktop runtime with OpenAI-compatible server.',
    baseUrl: 'http://localhost:1234/v1',
    modelsEndpoint: 'http://localhost:1234/v1/models',
    type: 'openai-compatible',
    defaultModel: 'lmstudio/llama-3.2-3b-instruct',
    docsUrl: 'https://lmstudio.ai',
  },
];

export function findProvider(id: ProviderId): ProviderInfo {
  const p = PROVIDERS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}
