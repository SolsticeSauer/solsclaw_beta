// Package secrets stores API keys outside of openclaw.json. It prefers the
// OS-native keychain (macOS Keychain, Windows Credential Manager, libsecret
// on Linux) via the pure-Go 99designs/keyring library; on systems where no
// secure backend is reachable (headless containers, libsecret-less servers)
// it falls back to a 0600 file in ~/.openclaw/secrets/env. This mirrors the
// behaviour of the previous TS implementation and keeps "no native deps"
// — keyring's macOS path uses /usr/bin/security, Windows uses Wincred via
// syscalls, Linux uses libsecret over D-Bus and otherwise falls through.
package secrets

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/99designs/keyring"

	"github.com/SolsticeSauer/solsclaw_beta/internal/platform"
)

const service = "solsclaw-installer"

type Storage string

const (
	StorageKeychain Storage = "keychain"
	StorageFile     Storage = "file"
)

func openRing() (keyring.Keyring, error) {
	return keyring.Open(keyring.Config{
		ServiceName: service,
		// Allow the file backend as a fallback so headless installs still work.
		AllowedBackends: []keyring.BackendType{
			keyring.KeychainBackend,
			keyring.SecretServiceBackend,
			keyring.WinCredBackend,
			keyring.FileBackend,
		},
		FileDir:                  filepath.Join(platform.OpenclawHome(), "secrets-keyring"),
		FilePasswordFunc:         func(string) (string, error) { return "", nil },
		KeychainTrustApplication: true,
	})
}

// Set stores the secret. Returns the reference string callers will write
// into openclaw.json (e.g. "keychain:solsclaw-installer/provider:tensorix").
func Set(account, value string) (ref string, storage Storage, err error) {
	ring, ringErr := openRing()
	if ringErr == nil {
		err = ring.Set(keyring.Item{
			Key:  account,
			Data: []byte(value),
		})
		if err == nil {
			return fmt.Sprintf("keychain:%s/%s", service, account), StorageKeychain, nil
		}
	}
	// Fall through to plain file.
	if err := writeFallback(account, value); err != nil {
		return "", "", err
	}
	envFile, _ := fallbackEnvFile()
	return fmt.Sprintf("file:%s#%s", envFile, account), StorageFile, nil
}

// Get reads a previously stored secret. Returns ("", nil) if absent.
func Get(account string) (string, error) {
	ring, err := openRing()
	if err == nil {
		item, getErr := ring.Get(account)
		if getErr == nil {
			return string(item.Data), nil
		}
	}
	envFile, err := fallbackEnvFile()
	if err != nil {
		return "", err
	}
	data, err := os.ReadFile(envFile)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
	}
	for _, line := range strings.Split(string(data), "\n") {
		if strings.HasPrefix(line, account+"=") {
			return line[len(account)+1:], nil
		}
	}
	return "", nil
}

func fallbackEnvFile() (string, error) {
	dir := filepath.Join(platform.OpenclawHome(), "secrets")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", err
	}
	return filepath.Join(dir, "env"), nil
}

func writeFallback(account, value string) error {
	path, err := fallbackEnvFile()
	if err != nil {
		return err
	}
	existing, _ := os.ReadFile(path)

	var lines []string
	for _, line := range strings.Split(string(existing), "\n") {
		if line == "" || strings.HasPrefix(line, account+"=") {
			continue
		}
		lines = append(lines, line)
	}
	lines = append(lines, fmt.Sprintf("%s=%s", account, value))
	return os.WriteFile(path, []byte(strings.Join(lines, "\n")+"\n"), 0o600)
}
