package steps

import (
	"context"
	"fmt"
	"runtime"

	"github.com/SolsticeSauer/solsclaw_beta/internal/installer"
)

const anzaInstallURL = "https://release.anza.xyz/stable/install"

type Solana struct{}

func (Solana) ID() string    { return "solana-cli" }
func (Solana) Label() string { return "Install Solana CLI (Anza release channel)" }

func (Solana) ShouldRun(sc installer.StepContext) bool {
	// Solana CLI inside a transient container has no good "where does the
	// keypair live" answer, so we leave it as a host-only step. Users on
	// Docker who need Solana can either add it to the Dockerfile or run
	// it on the host alongside.
	if sc.Submission.InstallMode == installer.ModeDocker {
		return false
	}
	return sc.Submission.OptionalFeatures.Solana.CLI
}

func (s Solana) Run(ctx context.Context, sc installer.StepContext) error {
	if runtime.GOOS == "windows" {
		sc.Bus.Log(s.ID(), "warn", "Solana CLI on native Windows requires WSL; skipping. Re-run inside WSL2 to install.")
		return nil
	}

	sc.Bus.Log(s.ID(), "info", "Downloading installer from "+anzaInstallURL)
	staged, err := stage(anzaInstallURL)
	if err != nil {
		return err
	}
	sc.Bus.Log(s.ID(), "info", fmt.Sprintf("Staged at %s (sha256=%s, %d bytes).", staged.Path, staged.SHA256, staged.Size))

	if err := streamCommand(ctx, sc, s.ID(), "sh", staged.Path); err != nil {
		return err
	}
	sc.Bus.Log(s.ID(), "info", "Add ~/.local/share/solana/install/active_release/bin to PATH.")
	return nil
}
