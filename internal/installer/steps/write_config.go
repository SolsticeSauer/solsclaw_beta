package steps

import (
	"context"
	"fmt"
	"strings"

	"github.com/SolsticeSauer/solsclaw_beta/internal/installer"
	"github.com/SolsticeSauer/solsclaw_beta/internal/platform"
)

type WriteConfig struct{}

func (WriteConfig) ID() string                              { return "write-config" }
func (WriteConfig) Label() string                           { return "Write openclaw.json" }
func (WriteConfig) ShouldRun(_ installer.StepContext) bool  { return true }

func (s WriteConfig) Run(_ context.Context, sc installer.StepContext) error {
	provider, ok := installer.FindProvider(sc.Submission.Provider)
	if !ok {
		return fmt.Errorf("unknown provider %q", sc.Submission.Provider)
	}

	// agents.defaults.model uses "<provider>/<model-id>" syntax. The provider
	// block's models array uses bare model IDs.
	bareModel := strings.TrimPrefix(sc.Submission.Model, string(sc.Submission.Provider)+"/")

	cfg := &installer.OpenclawConfig{
		Models: &installer.ModelsBlock{
			Providers: map[string]installer.ProviderConfig{
				string(sc.Submission.Provider): {
					APIKey:  sc.Submission.APIKey,
					BaseURL: provider.BaseURL,
					Models: []installer.ModelEntry{{
						ID:   bareModel,
						Name: bareModel,
					}},
				},
			},
		},
		Agents: &installer.AgentsBlock{
			Defaults: &installer.AgentDefaults{Model: sc.Submission.Model},
		},
	}

	if sc.Submission.OptionalFeatures.OpenAIGateway {
		cfg.Gateway = &installer.GatewayBlock{
			HTTP: &installer.HTTPGateway{
				Endpoints: &installer.HTTPEndpoints{
					ChatCompletions: &installer.ChatCompletionsEndpoint{Enabled: true},
				},
			},
		}
	}

	// In Docker mode the daemon doesn't read ~/.openclaw on the host;
	// it reads /root/.openclaw inside the container, which is bind-mounted
	// from ~/.solsclaw/docker/openclaw-data. The DockerWriteFiles step
	// creates that directory; we just write the config into it.
	target := platform.OpenclawConfigPath()
	if sc.Submission.InstallMode == installer.ModeDocker {
		target = platform.DockerOpenclawConfigPath()
	}

	written, err := installer.WriteConfigAt(cfg, target)
	if err != nil {
		return err
	}
	sc.Bus.Log(s.ID(), "info", "Wrote config to "+written)
	return nil
}
