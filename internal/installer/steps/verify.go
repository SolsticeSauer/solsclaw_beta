package steps

import (
	"context"
	"os/exec"

	"github.com/SolsticeSauer/solsclaw_beta/internal/installer"
)

type Verify struct{}

func (Verify) ID() string                              { return "verify" }
func (Verify) Label() string                           { return "Run `openclaw doctor`" }
func (Verify) ShouldRun(_ installer.StepContext) bool  { return true }

func (s Verify) Run(ctx context.Context, sc installer.StepContext) error {
	cmd := exec.CommandContext(ctx, "openclaw", "doctor")
	out, err := cmd.CombinedOutput()
	if err != nil {
		// `doctor` exits non-zero on warnings too. Surface the report but
		// don't fail the whole pipeline — the user can read the output and
		// decide how to act.
		sc.Bus.Log(s.ID(), "warn", "doctor reported issues:\n"+string(out))
		return nil
	}
	if len(out) == 0 {
		sc.Bus.Log(s.ID(), "info", "doctor reported no issues.")
	} else {
		sc.Bus.Log(s.ID(), "info", string(out))
	}
	return nil
}
