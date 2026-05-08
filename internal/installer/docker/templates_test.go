package docker

import (
	"strings"
	"testing"
)

// TestRenderTailscaleSidecar guards the shape of the generated compose so
// that future template tweaks don't silently drop the sidecar pattern from
// the upstream Tailscale guide.
func TestRenderTailscaleSidecar(t *testing.T) {
	plan, err := Render(Inputs{
		Provider:             "tensorix",
		APIKey:               "sk-test",
		OpenAIGatewayEnabled: true,
		TailscaleEnabled:     true,
		TailscaleHostname:    "my-openclaw",
		TailscaleAuthKey:     "tskey-auth-XYZ",
	})
	if err != nil {
		t.Fatalf("render: %v", err)
	}

	for _, want := range []string{
		"image: tailscale/tailscale",
		"hostname: my-openclaw",
		"network_mode: service:tailscale",
		"depends_on:",
		"./openclaw-data:/root/.openclaw",
		"NET_ADMIN",
	} {
		if !strings.Contains(strings.ToLower(plan.ComposeYAML), strings.ToLower(want)) {
			t.Errorf("compose missing %q\n%s", want, plan.ComposeYAML)
		}
	}

	if !strings.Contains(plan.EnvFile, "TS_AUTHKEY=tskey-auth-XYZ") {
		t.Errorf(".env missing TS_AUTHKEY\n%s", plan.EnvFile)
	}
	if !strings.Contains(plan.EnvFile, "SOLSCLAW_API_KEY=sk-test") {
		t.Errorf(".env missing API key\n%s", plan.EnvFile)
	}
}

func TestRenderNativeNoTailscale(t *testing.T) {
	plan, err := Render(Inputs{
		Provider:             "tensorix",
		APIKey:               "sk-test",
		OpenAIGatewayEnabled: false,
		TailscaleEnabled:     false,
	})
	if err != nil {
		t.Fatalf("render: %v", err)
	}

	if strings.Contains(plan.ComposeYAML, "tailscale") {
		t.Errorf("compose should not mention tailscale when disabled\n%s", plan.ComposeYAML)
	}
	if strings.Contains(plan.ComposeYAML, "127.0.0.1:18789") {
		t.Errorf("openai gateway port should not be published when feature disabled\n%s", plan.ComposeYAML)
	}
}
