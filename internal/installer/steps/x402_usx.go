package steps

import (
	"context"

	"github.com/SolsticeSauer/solsclaw_beta/internal/installer"
)

type X402USX struct{}

func (X402USX) ID() string    { return "x402-usx-skills" }
func (X402USX) Label() string { return "Register x402 + USX skills with OpenClaw" }

func (X402USX) ShouldRun(sc installer.StepContext) bool {
	return sc.Submission.OptionalFeatures.Solana.X402Skill || sc.Submission.OptionalFeatures.Solana.USXSkill
}

func (s X402USX) Run(ctx context.Context, sc installer.StepContext) error {
	var pkgs []string
	if sc.Submission.OptionalFeatures.Solana.X402Skill {
		pkgs = append(pkgs, "@openclaw/skill-x402")
	}
	if sc.Submission.OptionalFeatures.Solana.USXSkill {
		pkgs = append(pkgs, "@solstice/skill-usx")
	}
	for _, pkg := range pkgs {
		sc.Bus.Log(s.ID(), "info", "Installing skill "+pkg)
		if err := streamCommand(ctx, sc, s.ID(), "openclaw", "tools", "install", pkg); err != nil {
			return err
		}
	}
	return nil
}
