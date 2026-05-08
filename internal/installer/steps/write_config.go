package steps

import (
	"context"
	"fmt"
	"time"

	"github.com/SolsticeSauer/solsclaw_beta/internal/installer"
)

type WriteConfig struct{}

func (WriteConfig) ID() string                              { return "write-config" }
func (WriteConfig) Label() string                           { return "Write ~/.openclaw/openclaw.json" }
func (WriteConfig) ShouldRun(_ installer.StepContext) bool  { return true }

func (s WriteConfig) Run(_ context.Context, sc installer.StepContext) error {
	provider, ok := installer.FindProvider(sc.Submission.Provider)
	if !ok {
		return fmt.Errorf("unknown provider %q", sc.Submission.Provider)
	}

	apiKeyRef := "none"
	if !sc.Submission.Provider.IsLocal() {
		apiKeyRef = fmt.Sprintf("keychain:solsclaw-installer/provider:%s", sc.Submission.Provider)
	}

	cfg := &installer.OpenclawConfig{
		Schema: "https://docs.openclaw.ai/schema/openclaw.json",
		Agent: installer.AgentConfig{
			Model:     sc.Submission.Model,
			Workspace: sc.Submission.Workspace,
		},
		Providers: map[string]installer.ProviderConfig{
			string(sc.Submission.Provider): {
				Type:      provider.Type,
				BaseURL:   provider.BaseURL,
				APIKeyRef: apiKeyRef,
			},
		},
		Gateway: &installer.GatewayConfig{
			OpenAICompat: &installer.OpenAIGatewayConfig{
				Enabled: sc.Submission.OptionalFeatures.OpenAIGateway,
				Port:    18789,
			},
		},
		Telemetry: &installer.TelemetryConfig{Enabled: sc.Submission.Telemetry},
		Installer: &installer.InstallerStamp{
			Version:     sc.InstallerVersion,
			InstalledAt: time.Now().UTC().Format(time.RFC3339),
			Addons:      &sc.Submission.OptionalFeatures.Solana,
		},
	}
	if sc.Submission.OptionalFeatures.Tailscale.Enabled {
		cfg.Gateway.Tailscale = &installer.TailscaleConfig{
			Enabled:  true,
			Hostname: sc.Submission.OptionalFeatures.Tailscale.Hostname,
		}
	}

	target, err := installer.WriteConfig(cfg)
	if err != nil {
		return err
	}
	sc.Bus.Log(s.ID(), "info", "Wrote config to "+target)
	return nil
}
