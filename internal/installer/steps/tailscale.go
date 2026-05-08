package steps

import (
	"context"
	"fmt"
	"runtime"

	"github.com/SolsticeSauer/solsclaw_beta/internal/installer"
)

type Tailscale struct{}

func (Tailscale) ID() string    { return "tailscale" }
func (Tailscale) Label() string { return "Install Tailscale + register node" }

func (Tailscale) ShouldRun(sc installer.StepContext) bool {
	// Docker mode handles Tailscale via a sidecar container; no host
	// install needed.
	if sc.Submission.InstallMode == installer.ModeDocker {
		return false
	}
	return sc.Submission.OptionalFeatures.Tailscale.Enabled
}

func (s Tailscale) Run(ctx context.Context, sc installer.StepContext) error {
	if !commandExists("tailscale") {
		if err := installTailscale(ctx, sc, s.ID()); err != nil {
			return err
		}
	} else {
		sc.Bus.Log(s.ID(), "info", "Tailscale already installed; skipping install.")
	}

	args := []string{"up", "--accept-routes"}
	ts := sc.Submission.OptionalFeatures.Tailscale
	if ts.AuthKey != "" {
		args = append(args, "--authkey="+ts.AuthKey)
	}
	if ts.Hostname != "" {
		args = append(args, "--hostname="+ts.Hostname)
	}
	if err := streamCommand(ctx, sc, s.ID(), "tailscale", args...); err != nil {
		return err
	}

	// Auth keys are sensitive — drop the in-memory copy now that we're done.
	sc.Submission.OptionalFeatures.Tailscale.AuthKey = ""
	return nil
}

func installTailscale(ctx context.Context, sc installer.StepContext, stepID string) error {
	switch runtime.GOOS {
	case "darwin":
		sc.Bus.Log(stepID, "info", "Installing Tailscale via Homebrew...")
		return streamCommand(ctx, sc, stepID, "brew", "install", "--cask", "tailscale")
	case "linux":
		sc.Bus.Log(stepID, "info", "Downloading https://tailscale.com/install.sh ...")
		staged, err := stage("https://tailscale.com/install.sh")
		if err != nil {
			return err
		}
		sc.Bus.Log(stepID, "info", fmt.Sprintf("Staged at %s (sha256=%s)", staged.Path, staged.SHA256))
		return streamCommand(ctx, sc, stepID, "sh", staged.Path)
	case "windows":
		sc.Bus.Log(stepID, "info", "Installing Tailscale via winget...")
		return streamCommand(ctx, sc, stepID, "winget", "install", "--silent", "--id", "tailscale.tailscale")
	}
	return fmt.Errorf("Tailscale install not supported on %s", runtime.GOOS)
}
