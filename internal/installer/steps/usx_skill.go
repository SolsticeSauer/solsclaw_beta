package steps

import (
	"context"

	"github.com/SolsticeSauer/solsclaw_beta/internal/installer"
)

// USXSkill registers the Solstice USX stablecoin skill with OpenClaw.
type USXSkill struct{}

func (USXSkill) ID() string    { return "usx-skill" }
func (USXSkill) Label() string { return "Register USX stablecoin skill" }

func (USXSkill) ShouldRun(sc installer.StepContext) bool {
	if sc.Submission.InstallMode == installer.ModeDocker {
		return false
	}
	return sc.Submission.OptionalFeatures.USXSkill.Enabled
}

func (s USXSkill) Run(ctx context.Context, sc installer.StepContext) error {
	const pkg = "@solstice/skill-usx"
	sc.Bus.Log(s.ID(), "info", "Installing skill "+pkg)
	return streamCommand(ctx, sc, s.ID(), "openclaw", "tools", "install", pkg)
}
