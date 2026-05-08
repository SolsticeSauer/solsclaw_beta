package steps

import (
	"context"

	"github.com/SolsticeSauer/solsclaw_beta/internal/installer"
)

type InstallOpenclaw struct{}

func (InstallOpenclaw) ID() string                              { return "install-openclaw" }
func (InstallOpenclaw) Label() string                           { return "Install OpenClaw CLI globally" }
func (InstallOpenclaw) ShouldRun(_ installer.StepContext) bool  { return true }

func (s InstallOpenclaw) Run(ctx context.Context, sc installer.StepContext) error {
	pm, args := pickPackageManager()
	sc.Bus.Log(s.ID(), "info", "Using package manager: "+pm)
	return streamCommand(ctx, sc, s.ID(), pm, args...)
}

// pickPackageManager prefers pnpm > bun > npm because OpenClaw upstream
// recommends pnpm. We don't try to auto-install Node here — the bootstrap
// script handles that prerequisite.
func pickPackageManager() (string, []string) {
	switch {
	case commandExists("pnpm"):
		return "pnpm", []string{"add", "-g", "openclaw@latest"}
	case commandExists("bun"):
		return "bun", []string{"add", "-g", "openclaw@latest"}
	default:
		return "npm", []string{"install", "-g", "openclaw@latest"}
	}
}
