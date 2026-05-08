package steps

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/SolsticeSauer/solsclaw_beta/internal/installer"
	"github.com/SolsticeSauer/solsclaw_beta/internal/installer/docker"
	"github.com/SolsticeSauer/solsclaw_beta/internal/platform"
)

// DockerWriteFiles renders the Dockerfile, docker-compose.yml and .env into
// ~/.solsclaw/docker. We never overwrite a user's hand-edits silently — if
// the files already exist we back them up with a timestamp suffix.
type DockerWriteFiles struct{}

func (DockerWriteFiles) ID() string    { return "docker-write-files" }
func (DockerWriteFiles) Label() string { return "Generate Dockerfile + docker-compose.yml" }

func (DockerWriteFiles) ShouldRun(sc installer.StepContext) bool {
	return sc.Submission.InstallMode == installer.ModeDocker
}

func (s DockerWriteFiles) Run(_ context.Context, sc installer.StepContext) error {
	dir := platform.DockerDir()
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}

	plan, err := docker.Render(docker.Inputs{
		Provider:             string(sc.Submission.Provider),
		APIKey:               sc.Submission.APIKey,
		OpenAIGatewayEnabled: sc.Submission.OptionalFeatures.OpenAIGateway,
		TailscaleEnabled:     sc.Submission.OptionalFeatures.Tailscale.Enabled,
		TailscaleHostname:    fallbackHostname(sc.Submission.OptionalFeatures.Tailscale.Hostname),
		TailscaleAuthKey:     sc.Submission.OptionalFeatures.Tailscale.AuthKey,
	})
	if err != nil {
		return err
	}

	if err := writeWithBackup(filepath.Join(dir, "Dockerfile"), []byte(plan.Dockerfile), 0o644); err != nil {
		return err
	}
	if err := writeWithBackup(filepath.Join(dir, "docker-compose.yml"), []byte(plan.ComposeYAML), 0o644); err != nil {
		return err
	}
	// .env is sensitive — TailscaleAuthKey + APIKey go here.
	if err := writeWithBackup(filepath.Join(dir, ".env"), []byte(plan.EnvFile), 0o600); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(dir, plan.DataDirName), 0o700); err != nil {
		return err
	}
	sc.Bus.Log(s.ID(), "info", "Wrote Docker files to "+dir)

	// Drop the in-memory Tailscale auth key now that it's persisted to
	// the .env (where the compose file references it once at start time).
	sc.Submission.OptionalFeatures.Tailscale.AuthKey = ""
	return nil
}

func fallbackHostname(h string) string {
	if h != "" {
		return h
	}
	return "solsclaw"
}

func writeWithBackup(path string, data []byte, mode os.FileMode) error {
	if _, err := os.Stat(path); err == nil {
		bak := path + ".bak"
		_ = os.Remove(bak)
		if err := os.Rename(path, bak); err != nil {
			return fmt.Errorf("backup %s: %w", path, err)
		}
	}
	return os.WriteFile(path, data, mode)
}
