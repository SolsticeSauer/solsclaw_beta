package steps

import (
	"context"
	"fmt"
	"os/exec"
	"strings"

	"github.com/SolsticeSauer/solsclaw_beta/internal/installer"
	"github.com/SolsticeSauer/solsclaw_beta/internal/platform"
)

// DockerCheck verifies the host has Docker + compose available before any
// further docker step runs. We surface the actual install URL here so the
// failure leads to a fix rather than a stack trace.
type DockerCheck struct{}

func (DockerCheck) ID() string    { return "docker-check" }
func (DockerCheck) Label() string { return "Check Docker prerequisites" }

func (DockerCheck) ShouldRun(sc installer.StepContext) bool {
	return sc.Submission.InstallMode == installer.ModeDocker
}

func (s DockerCheck) Run(ctx context.Context, sc installer.StepContext) error {
	if _, err := exec.LookPath("docker"); err != nil {
		return fmt.Errorf("docker is required for Docker mode but is not on PATH. Install Docker Desktop (macOS / Windows) or docker-ce (Linux) and re-run. See README for per-platform install commands")
	}
	if out, err := exec.CommandContext(ctx, "docker", "compose", "version").CombinedOutput(); err == nil {
		sc.Bus.Log(s.ID(), "info", string(out))
	} else {
		return fmt.Errorf("`docker compose version` failed: %w. Install the Compose plugin: https://docs.docker.com/compose/install/", err)
	}
	// `docker info` is the cheapest call that requires a reachable engine.
	// Failing here means the CLI is installed but the daemon isn't running
	// (very common on macOS — Docker Desktop must be launched once).
	if out, err := exec.CommandContext(ctx, "docker", "info", "--format", "{{.ServerVersion}}").CombinedOutput(); err != nil {
		return fmt.Errorf("docker daemon is not reachable: %s. Start Docker Desktop / `systemctl start docker` and retry", strings.TrimSpace(string(out)))
	}
	return nil
}

// DockerComposeUp builds the image and brings the stack up in detached mode.
type DockerComposeUp struct{}

func (DockerComposeUp) ID() string    { return "docker-compose-up" }
func (DockerComposeUp) Label() string { return "Build image + docker compose up -d" }

func (DockerComposeUp) ShouldRun(sc installer.StepContext) bool {
	return sc.Submission.InstallMode == installer.ModeDocker
}

func (s DockerComposeUp) Run(ctx context.Context, sc installer.StepContext) error {
	dir := platform.DockerDir()
	cmd := exec.CommandContext(ctx, "docker", "compose", "up", "-d", "--build")
	cmd.Dir = dir
	pipe, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	cmd.Stderr = cmd.Stdout
	if err := cmd.Start(); err != nil {
		return err
	}
	scanLines(pipe, func(line string) {
		if line != "" {
			sc.Bus.Log(s.ID(), "info", line)
		}
	})
	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("docker compose up failed in %s: %w", dir, err)
	}
	sc.Bus.Log(s.ID(), "info", "Stack is up. Use `docker compose logs -f openclaw` for live output.")
	return nil
}

// DockerVerify runs `openclaw doctor` inside the running container as the
// equivalent of the native verify step.
type DockerVerify struct{}

func (DockerVerify) ID() string    { return "docker-verify" }
func (DockerVerify) Label() string { return "Run `openclaw doctor` inside container" }

func (DockerVerify) ShouldRun(sc installer.StepContext) bool {
	return sc.Submission.InstallMode == installer.ModeDocker
}

func (s DockerVerify) Run(ctx context.Context, sc installer.StepContext) error {
	cmd := exec.CommandContext(ctx, "docker", "compose", "exec", "-T", "openclaw", "openclaw", "doctor")
	cmd.Dir = platform.DockerDir()
	out, err := cmd.CombinedOutput()
	if err != nil {
		// `doctor` exits non-zero on advisory warnings; surface the
		// report but don't fail the pipeline.
		sc.Bus.Log(s.ID(), "warn", "doctor reported issues:\n"+string(out))
		return nil
	}
	sc.Bus.Log(s.ID(), "info", string(out))
	return nil
}
