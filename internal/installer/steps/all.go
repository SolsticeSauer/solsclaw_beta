package steps

import "github.com/SolsticeSauer/solsclaw_beta/internal/installer"

// Default returns the canonical install pipeline in execution order.
// Steps internally decide via ShouldRun whether they apply to the chosen
// install mode (native vs docker), so a single ordered list captures both
// flows. EnsureNode runs before InstallOpenclaw because freshly-provisioned
// cloud hosts (DigitalOcean Ubuntu droplets, etc.) ship without npm.
func Default() []installer.Step {
	return []installer.Step{
		PersistAPIKey{},
		WriteConfig{},
		// Native path
		EnsureNode{},
		InstallOpenclaw{},
		RunOnboard{},
		OpenAIGateway{},
		Tailscale{},
		Solana{},
		X402USX{},
		Verify{},
		// Docker path. We render files first so a Docker-daemon outage at
		// install time still leaves a working tree the user can `docker
		// compose up -d --build` later by hand.
		DockerWriteFiles{},
		DockerCheck{},
		DockerComposeUp{},
		DockerVerify{},
	}
}
