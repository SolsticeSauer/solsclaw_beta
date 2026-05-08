package installer

// ProviderInfo is what the UI sees in /api/providers.
type ProviderInfo struct {
	ID             ProviderID `json:"id"`
	Label          string     `json:"label"`
	Description    string     `json:"description"`
	BaseURL        string     `json:"baseUrl,omitempty"`
	Type           string     `json:"type"`
	DefaultModel   string     `json:"defaultModel"`
	ModelsEndpoint string     `json:"modelsEndpoint,omitempty"`
	IsDefault      bool       `json:"isDefault,omitempty"`
	DocsURL        string     `json:"docsUrl"`
}

// Providers lists the LLM backends supported by the wizard. tensorix is
// pinned first with IsDefault=true so the UI surfaces it as the primary
// option without doing client-side ordering tricks.
var Providers = []ProviderInfo{
	{
		ID:             ProviderTensorix,
		Label:          "Tensorix",
		Description:    "Default. Unified OpenAI-compatible gateway with curated open-weights and proprietary models.",
		BaseURL:        "https://api.tensorix.ai/v1",
		ModelsEndpoint: "https://api.tensorix.ai/v1/models",
		Type:           "openai-compatible",
		DefaultModel:   "tensorix/glm-4.6",
		IsDefault:      true,
		DocsURL:        "https://docs.tensorix.ai",
	},
	{
		ID:           ProviderAnthropic,
		Label:        "Anthropic",
		Description:  "Claude Opus, Sonnet, Haiku — top-tier reasoning and tool use.",
		Type:         "native",
		DefaultModel: "anthropic/claude-opus-4-7",
		DocsURL:      "https://docs.anthropic.com",
	},
	{
		ID:             ProviderOpenAI,
		Label:          "OpenAI",
		Description:    "GPT family + o-series reasoning models.",
		BaseURL:        "https://api.openai.com/v1",
		ModelsEndpoint: "https://api.openai.com/v1/models",
		Type:           "openai-compatible",
		DefaultModel:   "openai/gpt-4o",
		DocsURL:        "https://platform.openai.com/docs",
	},
	{
		ID:           ProviderGoogle,
		Label:        "Google Gemini",
		Description:  "Gemini Pro / Flash — strong multimodal and long context.",
		Type:         "native",
		DefaultModel: "google/gemini-2.5-pro",
		DocsURL:      "https://ai.google.dev",
	},
	{
		ID:             ProviderMistral,
		Label:          "Mistral",
		Description:    "Mistral Large, Codestral and embedding models.",
		BaseURL:        "https://api.mistral.ai/v1",
		ModelsEndpoint: "https://api.mistral.ai/v1/models",
		Type:           "openai-compatible",
		DefaultModel:   "mistral/mistral-large-latest",
		DocsURL:        "https://docs.mistral.ai",
	},
	{
		ID:             ProviderDeepSeek,
		Label:          "DeepSeek",
		Description:    "DeepSeek-V3, DeepSeek-R1 reasoning model.",
		BaseURL:        "https://api.deepseek.com/v1",
		ModelsEndpoint: "https://api.deepseek.com/v1/models",
		Type:           "openai-compatible",
		DefaultModel:   "deepseek/deepseek-chat",
		DocsURL:        "https://api-docs.deepseek.com",
	},
	{
		ID:             ProviderGroq,
		Label:          "Groq",
		Description:    "Ultra-low-latency inference for Llama, Mixtral, Qwen.",
		BaseURL:        "https://api.groq.com/openai/v1",
		ModelsEndpoint: "https://api.groq.com/openai/v1/models",
		Type:           "openai-compatible",
		DefaultModel:   "groq/llama-3.3-70b-versatile",
		DocsURL:        "https://console.groq.com/docs",
	},
	{
		ID:             ProviderTogether,
		Label:          "Together AI",
		Description:    "Hosted open-weights models with OpenAI compatibility.",
		BaseURL:        "https://api.together.xyz/v1",
		ModelsEndpoint: "https://api.together.xyz/v1/models",
		Type:           "openai-compatible",
		DefaultModel:   "together/meta-llama/Llama-3.3-70B-Instruct-Turbo",
		DocsURL:        "https://docs.together.ai",
	},
	{
		ID:           ProviderPerplexity,
		Label:        "Perplexity",
		Description:  "Search-grounded LLMs (sonar family).",
		BaseURL:      "https://api.perplexity.ai",
		Type:         "openai-compatible",
		DefaultModel: "perplexity/sonar-pro",
		DocsURL:      "https://docs.perplexity.ai",
	},
	{
		ID:             ProviderXAI,
		Label:          "xAI",
		Description:    "Grok family.",
		BaseURL:        "https://api.x.ai/v1",
		ModelsEndpoint: "https://api.x.ai/v1/models",
		Type:           "openai-compatible",
		DefaultModel:   "xai/grok-2",
		DocsURL:        "https://docs.x.ai",
	},
	{
		ID:             ProviderOllama,
		Label:          "Ollama (local)",
		Description:    "Run open models locally; no API key required.",
		BaseURL:        "http://localhost:11434/v1",
		ModelsEndpoint: "http://localhost:11434/v1/models",
		Type:           "openai-compatible",
		DefaultModel:   "ollama/llama3.2",
		DocsURL:        "https://ollama.com",
	},
	{
		ID:             ProviderLMStudio,
		Label:          "LM Studio (local)",
		Description:    "Local desktop runtime with OpenAI-compatible server.",
		BaseURL:        "http://localhost:1234/v1",
		ModelsEndpoint: "http://localhost:1234/v1/models",
		Type:           "openai-compatible",
		DefaultModel:   "lmstudio/llama-3.2-3b-instruct",
		DocsURL:        "https://lmstudio.ai",
	},
}

func FindProvider(id ProviderID) (ProviderInfo, bool) {
	for _, p := range Providers {
		if p.ID == id {
			return p, true
		}
	}
	return ProviderInfo{}, false
}
