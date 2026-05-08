package steps

import "github.com/SolsticeSauer/solsclaw_beta/internal/installer"

// Default returns the canonical install pipeline in execution order.
// EnsureNode runs before InstallOpenclaw because freshly-provisioned cloud
// hosts (DigitalOcean Ubuntu droplets, etc.) ship without npm.
func Default() []installer.Step {
	return []installer.Step{
		PersistAPIKey{},
		WriteConfig{},
		EnsureNode{},
		InstallOpenclaw{},
		RunOnboard{},
		OpenAIGateway{},
		Tailscale{},
		Solana{},
		X402USX{},
		Verify{},
	}
}
