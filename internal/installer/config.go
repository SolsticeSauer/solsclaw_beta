package installer

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"time"

	"github.com/SolsticeSauer/solsclaw_beta/internal/platform"
)

// ReadConfig returns the existing openclaw.json or (nil, nil) when no file
// exists. Any other I/O or parse error propagates.
func ReadConfig() (*OpenclawConfig, error) {
	raw, err := os.ReadFile(platform.OpenclawConfigPath())
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil, nil
		}
		return nil, err
	}
	var cfg OpenclawConfig
	if err := json.Unmarshal(raw, &cfg); err != nil {
		return nil, fmt.Errorf("parse openclaw.json: %w", err)
	}
	return &cfg, nil
}

// WriteConfig persists a config atomically. If a file already exists at the
// target, it is backed up to <path>.bak.<RFC3339-stamp> first so that no
// successful previous setup is silently destroyed.
func WriteConfig(cfg *OpenclawConfig) (string, error) {
	home := platform.OpenclawHome()
	if err := os.MkdirAll(home, 0o700); err != nil {
		return "", err
	}

	target := platform.OpenclawConfigPath()
	if _, err := os.Stat(target); err == nil {
		stamp := time.Now().UTC().Format("20060102T150405Z")
		backup := fmt.Sprintf("%s.bak.%s", target, stamp)
		if err := copyFile(target, backup); err != nil {
			return "", fmt.Errorf("backup existing config: %w", err)
		}
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return "", err
	}

	tmp := filepath.Join(home, fmt.Sprintf(".openclaw.json.tmp-%d", os.Getpid()))
	if err := os.WriteFile(tmp, data, 0o600); err != nil {
		return "", err
	}
	if err := os.Rename(tmp, target); err != nil {
		_ = os.Remove(tmp)
		return "", err
	}
	return target, nil
}

func copyFile(src, dst string) error {
	in, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, in, 0o600)
}
