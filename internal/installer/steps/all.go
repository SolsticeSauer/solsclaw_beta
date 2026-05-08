package steps

import "github.com/SolsticeSauer/solsclaw_beta/internal/installer"

// Default returns the canonical install pipeline in execution order.
func Default() []installer.Step {
	return []installer.Step{
		PersistAPIKey{},
		WriteConfig{},
		InstallOpenclaw{},
		RunOnboard{},
		OpenAIGateway{},
		Tailscale{},
		Solana{},
		X402USX{},
		Verify{},
	}
}
