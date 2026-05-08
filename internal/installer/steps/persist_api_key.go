// Package steps implements the individual pipeline operations the installer
// runs. Each step is a small struct so they can be composed differently
// (e.g. a future "settings reapply" mode that skips the heavy install/onboard
// steps) without duplicating logic.
package steps

import (
	"context"
	"fmt"
	"strings"

	"github.com/SolsticeSauer/solsclaw_beta/internal/installer"
	"github.com/SolsticeSauer/solsclaw_beta/internal/secrets"
)

type PersistAPIKey struct{}

func (PersistAPIKey) ID() string    { return "persist-api-key" }
func (PersistAPIKey) Label() string { return "Store API key in OS keychain" }

func (PersistAPIKey) ShouldRun(sc installer.StepContext) bool {
	if sc.Submission.Provider.IsLocal() {
		return false
	}
	// Empty key in settings-mode means "keep existing" — skip the rotation.
	return strings.TrimSpace(sc.Submission.APIKey) != ""
}

func (s PersistAPIKey) Run(_ context.Context, sc installer.StepContext) error {
	account := fmt.Sprintf("provider:%s", sc.Submission.Provider)
	_, storage, err := secrets.Set(account, sc.Submission.APIKey)
	if err != nil {
		return err
	}
	sc.Bus.Log(s.ID(), "info", fmt.Sprintf("Saved API key (%s) as %s.", storage, account))
	return nil
}
