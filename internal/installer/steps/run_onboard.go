package steps

import (
	"context"

	"github.com/SolsticeSauer/solsclaw_beta/internal/installer"
)

type RunOnboard struct{}

func (RunOnboard) ID() string                              { return "onboard-daemon" }
func (RunOnboard) Label() string                           { return "Register OpenClaw daemon" }
func (RunOnboard) ShouldRun(_ installer.StepContext) bool  { return true }

func (s RunOnboard) Run(ctx context.Context, sc installer.StepContext) error {
	return streamCommand(ctx, sc, s.ID(), "openclaw", "onboard", "--install-daemon", "--non-interactive")
}
