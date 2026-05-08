// Package platform centralises OS-specific paths so the rest of the codebase
// can stay platform-agnostic.
package platform

import (
	"os"
	"path/filepath"
	"runtime"
)

// OS is one of "darwin", "linux", "windows".
func OS() string { return runtime.GOOS }

// Arch is one of "amd64", "arm64".
func Arch() string { return runtime.GOARCH }

// OpenclawHome is ~/.openclaw — the canonical OpenClaw config root.
func OpenclawHome() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".openclaw")
}

// OpenclawConfigPath is ~/.openclaw/openclaw.json.
func OpenclawConfigPath() string {
	return filepath.Join(OpenclawHome(), "openclaw.json")
}

// DefaultWorkspace is ~/OpenClaw, the suggested workspace directory.
func DefaultWorkspace() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, "OpenClaw")
}

// InstallerHome is ~/.solsclaw, where the binary itself caches state.
func InstallerHome() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".solsclaw")
}

// DockerDir is ~/.solsclaw/docker — where the Dockerfile, compose.yml, .env
// and the per-container OpenClaw state directory live for the Docker install
// path.
func DockerDir() string {
	return filepath.Join(InstallerHome(), "docker")
}

// DockerOpenclawConfigPath returns the path to openclaw.json inside the
// host-side mount that backs the container's /root/.openclaw volume.
func DockerOpenclawConfigPath() string {
	return filepath.Join(DockerDir(), "openclaw-data", "openclaw.json")
}
