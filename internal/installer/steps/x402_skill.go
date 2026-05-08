package steps

import (
	"context"

	"github.com/SolsticeSauer/solsclaw_beta/internal/installer"
)

// X402Skill registers OpenClaw's x402 payment skill (Coinbase HTTP-402
// payment protocol bridge). One file per feature is the modular convention
// in this package.
type X402Skill struct{}

func (X402Skill) ID() string    { return "x402-skill" }
func (X402Skill) Label() string { return "Register x402 skill with OpenClaw" }

func (X402Skill) ShouldRun(sc installer.StepContext) bool {
	if sc.Submission.InstallMode == installer.ModeDocker {
		return false
	}
	return sc.Submission.OptionalFeatures.X402Skill.Enabled
}

func (s X402Skill) Run(ctx context.Context, sc installer.StepContext) error {
	const pkg = "@openclaw/skill-x402"
	sc.Bus.Log(s.ID(), "info", "Installing skill "+pkg)
	return streamCommand(ctx, sc, s.ID(), "openclaw", "tools", "install", pkg)
}
