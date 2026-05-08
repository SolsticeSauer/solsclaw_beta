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

// FeatureToggle is the canonical "is this enabled?" payload every plain
// feature submits. Features that need extra fields (Tailscale auth key,
// future ones) define their own struct that embeds the same Enabled bool
// at the same json key — the UI's feature registry treats them uniformly.
type FeatureToggle struct {
	Enabled bool `json:"enabled"`
}

type TailscaleFeature struct {
	Enabled  bool   `json:"enabled"`
	AuthKey  string `json:"authKey,omitempty"`
	Hostname string `json:"hostname,omitempty"`
}

// OptionalFeatures is intentionally a flat record: one named field per
// feature so adding, renaming or removing a feature touches exactly one
// schema field plus its step file. No nested grouping (the previous
// solana.{cli,x402Skill,usxSkill} sub-struct conflated three independent
// features and made the UI hard to extend).
type OptionalFeatures struct {
	OpenAIGateway FeatureToggle    `json:"openaiGateway"`
	Tailscale     TailscaleFeature `json:"tailscale"`
	SolanaCLI     FeatureToggle    `json:"solanaCli"`
	X402Skill     FeatureToggle    `json:"x402Skill"`
	USXSkill      FeatureToggle    `json:"usxSkill"`
}

type InstallMode string

const (
	// ModeNative installs OpenClaw directly on the host: Node.js is
	// downloaded under ~/.solsclaw, openclaw is npm-installed globally,
	// and the daemon is registered with launchd / systemd / Windows.
	ModeNative InstallMode = "native"
	// ModeDocker writes a Dockerfile + docker-compose.yml under
	// ~/.solsclaw/docker, builds the image locally, and runs OpenClaw
	// in a container with state mounted as a volume. Optional Tailscale
	// is added as a sidecar service per the upstream Tailscale docs.
	ModeDocker InstallMode = "docker"
)

func (m InstallMode) Valid() bool {
	return m == ModeNative || m == ModeDocker
}

// WizardSubmission is the shape sent by the UI on /api/install.
type WizardSubmission struct {
	InstallMode      InstallMode      `json:"installMode"`
	Provider         ProviderID       `json:"provider"`
	APIKey           string           `json:"apiKey"`
	Model            string           `json:"model"`
	Workspace        string           `json:"workspace"`
	Telemetry        bool             `json:"telemetry"`
	OptionalFeatures OptionalFeatures `json:"optionalFeatures"`
}

func (w *WizardSubmission) Validate() error {
	if w.InstallMode == "" {
		w.InstallMode = ModeNative
	}
	if !w.InstallMode.Valid() {
		return errors.New("installMode is invalid")
	}
	if !w.Provider.Valid() {
		return errors.New("provider is invalid")
	}
	if strings.TrimSpace(w.Model) == "" {
		return errors.New("model is required")
	}
	if strings.TrimSpace(w.Workspace) == "" {
		return errors.New("workspace is required")
	}
	if w.OptionalFeatures.Tailscale.Enabled &&
		w.InstallMode == ModeDocker &&
		strings.TrimSpace(w.OptionalFeatures.Tailscale.AuthKey) == "" {
		return errors.New("tailscale.authKey is required when running in Docker mode")
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
