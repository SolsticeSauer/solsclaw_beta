package server

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"runtime"
	"strings"
	"time"

	"github.com/SolsticeSauer/solsclaw_beta/internal/installer"
	"github.com/SolsticeSauer/solsclaw_beta/internal/installer/steps"
	"github.com/SolsticeSauer/solsclaw_beta/internal/platform"
)

type Deps struct {
	InstallerVersion  string
	ShutdownRequested chan<- struct{}
}

func registerRoutes(mux *http.ServeMux, d Deps) {
	mux.HandleFunc("/api/state", handleState)
	mux.HandleFunc("/api/providers", handleProviders)
	mux.HandleFunc("/api/providers/test-key", handleTestKey)
	mux.HandleFunc("/api/install", handleInstall(d))
	mux.HandleFunc("/api/shutdown", handleShutdown(d))
}

// handleShutdown lets the UI request a graceful exit. We acknowledge
// immediately so the Quit button can render a "goodbye" message before the
// process disappears, then signal main via the shared channel after a short
// flush delay. The channel is buffered (size 1) and closed exactly once;
// repeated clicks are no-ops.
func handleShutdown(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			writeJSONError(w, http.StatusMethodNotAllowed, "POST only")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "message": "shutting down"})
		if d.ShutdownRequested == nil {
			return
		}
		go func() {
			time.Sleep(250 * time.Millisecond)
			select {
			case d.ShutdownRequested <- struct{}{}:
			default:
				// Already requested — do nothing.
			}
		}()
	}
}

type stateResponse struct {
	Platform       string                  `json:"platform"`
	GoVersion      string                  `json:"goVersion"`
	ConfigPath     string                  `json:"configPath"`
	Mode           string                  `json:"mode"`
	ExistingConfig *installer.OpenclawConfig `json:"existingConfig"`
}

func handleState(w http.ResponseWriter, _ *http.Request) {
	cfg, err := installer.ReadConfig()
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	mode := "install"
	if cfg != nil {
		mode = "settings"
	}
	writeJSON(w, http.StatusOK, stateResponse{
		Platform:       runtime.GOOS,
		GoVersion:      runtime.Version(),
		ConfigPath:     platform.OpenclawConfigPath(),
		Mode:           mode,
		ExistingConfig: cfg,
	})
}

func handleProviders(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"providers": installer.Providers})
}

type testKeyRequest struct {
	Provider installer.ProviderID `json:"provider"`
	APIKey   string               `json:"apiKey"`
}

// openaiModelsResponse mirrors the shape that every OpenAI-compatible
// provider returns from /v1/models. We only need the IDs.
type openaiModelsResponse struct {
	Data []struct {
		ID string `json:"id"`
	} `json:"data"`
}

func handleTestKey(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		writeJSONError(w, http.StatusMethodNotAllowed, "POST only")
		return
	}
	var req testKeyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid body")
		return
	}
	provider, ok := installer.FindProvider(req.Provider)
	if !ok {
		writeJSONError(w, http.StatusBadRequest, "unknown provider")
		return
	}
	if provider.ModelsEndpoint == "" {
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":       true,
			"verified": false,
			"reason":   "no-test-endpoint",
		})
		return
	}
	probeReq, _ := http.NewRequestWithContext(r.Context(), http.MethodGet, provider.ModelsEndpoint, nil)
	if req.APIKey != "" {
		probeReq.Header.Set("Authorization", "Bearer "+req.APIKey)
	}

	res, err := http.DefaultClient.Do(probeReq)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	defer res.Body.Close()

	verified := res.StatusCode >= 200 && res.StatusCode < 300
	var models []string
	if verified {
		// Cap the read so a misbehaving provider can't exhaust memory.
		const maxBytes = 2 << 20
		body, _ := io.ReadAll(io.LimitReader(res.Body, maxBytes))
		var parsed openaiModelsResponse
		if jerr := json.Unmarshal(body, &parsed); jerr == nil {
			for _, m := range parsed.Data {
				if id := strings.TrimSpace(m.ID); id != "" {
					models = append(models, id)
				}
			}
		}
	} else {
		_, _ = io.Copy(io.Discard, res.Body)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":       verified,
		"status":   res.StatusCode,
		"verified": verified,
		"models":   models,
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeJSONError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]any{"error": msg})
}

func handleInstall(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			writeJSONError(w, http.StatusMethodNotAllowed, "POST only")
			return
		}
		var sub installer.WizardSubmission
		if err := json.NewDecoder(r.Body).Decode(&sub); err != nil {
			writeJSONError(w, http.StatusBadRequest, "invalid body")
			return
		}
		if err := sub.Validate(); err != nil {
			writeJSONError(w, http.StatusBadRequest, err.Error())
			return
		}

		flusher, ok := w.(http.Flusher)
		if !ok {
			writeJSONError(w, http.StatusInternalServerError, "streaming not supported")
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache, no-transform")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no")

		ch := make(chan installer.Event, 64)
		bus := installer.NewBus(ch)

		// Drive the pipeline in a goroutine so the response writer can stay
		// in the request-handling goroutine; closes ch when finished.
		go func() {
			failed, ok := installer.RunPipeline(r.Context(), installer.StepContext{
				Submission:       sub,
				Bus:              bus,
				InstallerVersion: d.InstallerVersion,
			}, steps.Default())
			summary := map[string]any{}
			if !ok {
				summary["failedStep"] = failed
			}
			bus.Done(ok, summary)
			close(ch)
		}()

		for ev := range ch {
			data, err := json.Marshal(ev)
			if err != nil {
				continue
			}
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}
	}
}
