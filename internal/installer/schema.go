// Package installer holds the domain types: provider catalogue, wizard
// submission shape, and the openclaw.json config we render.
//
// The openclaw.json schema we target here is the one validated by
// `openclaw doctor`: top-level `models`, `agents`, `gateway`, etc. We
// deliberately render a minimal slice — the user's chosen provider, the
// default model, and (optionally) the OpenAI-compatible gateway endpoint —
// and let OpenClaw apply its own defaults for everything else.
package installer

import (
	"errors"
	"strings"
)

type ProviderID string

const (
	ProviderTensorix   ProviderID = "tensorix"
	ProviderAnthropic  ProviderID = "anthropic"
	ProviderOpenAI     ProviderID = "openai"
	ProviderGoogle     ProviderID = "google"
	ProviderMistral    ProviderID = "mistral"
	ProviderDeepSeek   ProviderID = "deepseek"
	ProviderGroq       ProviderID = "groq"
	ProviderTogether   ProviderID = "together"
	ProviderPerplexity ProviderID = "perplexity"
	ProviderXAI        ProviderID = "xai"
	ProviderOllama     ProviderID = "ollama"
	ProviderLMStudio   ProviderID = "lmstudio"
)

func (p ProviderID) Valid() bool {
	switch p {
	case ProviderTensorix, ProviderAnthropic, ProviderOpenAI, ProviderGoogle,
		ProviderMistral, ProviderDeepSeek, ProviderGroq, ProviderTogether,
		ProviderPerplexity, ProviderXAI, ProviderOllama, ProviderLMStudio:
		return true
	}
	return false
}

// IsLocal reports whether this provider runs locally and so doesn't need an
// API key persisted to the keychain.
func (p ProviderID) IsLocal() bool {
	return p == ProviderOllama || p == ProviderLMStudio
}

type TailscaleSubmission struct {
	Enabled  bool   `json:"enabled"`
	AuthKey  string `json:"authKey,omitempty"`
	Hostname string `json:"hostname,omitempty"`
}

type SolanaStack struct {
	CLI       bool `json:"cli"`
	X402Skill bool `json:"x402Skill"`
	USXSkill  bool `json:"usxSkill"`
}

type OptionalFeatures struct {
	OpenAIGateway bool                `json:"openaiGateway"`
	Tailscale     TailscaleSubmission `json:"tailscale"`
	Solana        SolanaStack         `json:"solana"`
}

// WizardSubmission is the shape sent by the UI on /api/install.
type WizardSubmission struct {
	Provider         ProviderID       `json:"provider"`
	APIKey           string           `json:"apiKey"`
	Model            string           `json:"model"`
	Workspace        string           `json:"workspace"`
	Telemetry        bool             `json:"telemetry"`
	OptionalFeatures OptionalFeatures `json:"optionalFeatures"`
}

func (w *WizardSubmission) Validate() error {
	if !w.Provider.Valid() {
		return errors.New("provider is invalid")
	}
	if strings.TrimSpace(w.Model) == "" {
		return errors.New("model is required")
	}
	if strings.TrimSpace(w.Workspace) == "" {
		return errors.New("workspace is required")
	}
	return nil
}

// -- openclaw.json schema --
//
// Only the keys we actually populate are typed. We use omitempty + pointers
// so optional sub-blocks vanish from the output entirely instead of leaving
// behind a noisy `"foo": null` that could trip OpenClaw's strict validator.

type ModelEntry struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type ProviderConfig struct {
	// BaseURL is required by OpenClaw's validator for every provider —
	// native ones included.
	BaseURL string `json:"baseUrl"`
	// APIKey is intentionally inline today — OpenClaw's secret-reference
	// syntax is documented separately and we'd rather ship a working
	// installer than a broken one with the right pointer story.
	APIKey string       `json:"apiKey,omitempty"`
	Models []ModelEntry `json:"models"`
}

type ModelsBlock struct {
	Providers map[string]ProviderConfig `json:"providers,omitempty"`
}

type AgentDefaults struct {
	Model string `json:"model"`
}

type AgentsBlock struct {
	Defaults *AgentDefaults `json:"defaults,omitempty"`
}

type ChatCompletionsEndpoint struct {
	Enabled bool `json:"enabled"`
}

type HTTPEndpoints struct {
	ChatCompletions *ChatCompletionsEndpoint `json:"chatCompletions,omitempty"`
}

type HTTPGateway struct {
	Endpoints *HTTPEndpoints `json:"endpoints,omitempty"`
}

type GatewayBlock struct {
	HTTP *HTTPGateway `json:"http,omitempty"`
}

// OpenclawConfig is the slice of openclaw.json we own. Many other top-level
// keys exist (mcp, skills, plugins, browser, ui, hooks, ...) but we don't
// touch them; OpenClaw fills in its defaults.
type OpenclawConfig struct {
	Models  *ModelsBlock  `json:"models,omitempty"`
	Agents  *AgentsBlock  `json:"agents,omitempty"`
	Gateway *GatewayBlock `json:"gateway,omitempty"`
}
