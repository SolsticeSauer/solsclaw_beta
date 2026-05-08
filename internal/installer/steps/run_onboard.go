package steps

import (
	"context"

	"github.com/SolsticeSauer/solsclaw_beta/internal/installer"
)

type RunOnboard struct{}

func (RunOnboard) ID() string                              { return "onboard-daemon" }
func (RunOnboard) Label() string                           { return "Register OpenClaw daemon" }
func (RunOnboard) ShouldRun(sc installer.StepContext) bool {
	return sc.Submission.InstallMode != installer.ModeDocker
}

func (s RunOnboard) Run(ctx context.Context, sc installer.StepContext) error {
	// --accept-risk is required alongside --non-interactive: OpenClaw won't
	// run an unattended setup without an explicit acknowledgement, and the
	// user just clicked "Install" through the wizard so consent is implicit.
	return streamCommand(ctx, sc, s.ID(), "openclaw", "onboard",
		"--install-daemon", "--non-interactive", "--accept-risk")
}
