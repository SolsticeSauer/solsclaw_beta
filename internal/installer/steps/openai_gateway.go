package steps

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"

	"github.com/SolsticeSauer/solsclaw_beta/internal/installer"
	"github.com/SolsticeSauer/solsclaw_beta/internal/secrets"
)

type OpenAIGateway struct{}

func (OpenAIGateway) ID() string    { return "openai-gateway" }
func (OpenAIGateway) Label() string { return "Enable OpenClaw OpenAI-compatible gateway" }

func (OpenAIGateway) ShouldRun(sc installer.StepContext) bool {
	return sc.Submission.OptionalFeatures.OpenAIGateway
}

func (s OpenAIGateway) Run(ctx context.Context, sc installer.StepContext) error {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return err
	}
	token := "oc_" + hex.EncodeToString(buf)

	ref, _, err := secrets.Set("gateway:openai-compat-token", token)
	if err != nil {
		return err
	}
	sc.Bus.Log(s.ID(), "info", fmt.Sprintf("Issued shared-secret token (%s).", ref))

	// Best-effort daemon-side toggle. The on-disk config we wrote earlier
	// already carries gateway.openaiCompat.enabled, so the daemon will pick
	// it up on its next config reload regardless.
	if err := streamCommand(ctx, sc, s.ID(), "openclaw", "gateway", "set-openai-compat", "--enable", "--token-ref", ref); err != nil {
		sc.Bus.Log(s.ID(), "warn", "Daemon-side toggle skipped: "+err.Error())
	}
	return nil
}
