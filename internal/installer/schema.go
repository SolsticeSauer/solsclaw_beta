// Package installer holds the domain types: provider catalogue, wizard
// submission shape, and the openclaw.json config we render. Validation is
// done with hand-written checks rather than a third-party schema library to
// keep the dependency surface tiny.
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

// OpenAIGatewayConfig models the gateway.openaiCompat block in openclaw.json.
type OpenAIGatewayConfig struct {
	Enabled  bool   `json:"enabled"`
	Port     int    `json:"port"`
	TokenRef string `json:"tokenRef,omitempty"`
}

type TailscaleConfig struct {
	Enabled   bool   `json:"enabled"`
	Hostname  string `json:"hostname,omitempty"`
	Ephemeral bool   `json:"ephemeral"`
}

type GatewayConfig struct {
	OpenAICompat *OpenAIGatewayConfig `json:"openaiCompat,omitempty"`
	Tailscale    *TailscaleConfig     `json:"tailscale,omitempty"`
}

type ProviderConfig struct {
	Type      string `json:"type"`
	BaseURL   string `json:"baseUrl,omitempty"`
	APIKeyRef string `json:"apiKeyRef"`
}

type AgentConfig struct {
	Model     string `json:"model"`
	Workspace string `json:"workspace,omitempty"`
}

type TelemetryConfig struct {
	Enabled bool `json:"enabled"`
}

type InstallerStamp struct {
	Version     string       `json:"version"`
	InstalledAt string       `json:"installedAt"`
	Addons      *SolanaStack `json:"addons,omitempty"`
}

// OpenclawConfig is the full ~/.openclaw/openclaw.json document.
type OpenclawConfig struct {
	Schema    string                    `json:"$schema,omitempty"`
	Agent     AgentConfig               `json:"agent"`
	Providers map[string]ProviderConfig `json:"providers"`
	Gateway   *GatewayConfig            `json:"gateway,omitempty"`
	Telemetry *TelemetryConfig          `json:"telemetry,omitempty"`
	Installer *InstallerStamp           `json:"installer,omitempty"`
}
