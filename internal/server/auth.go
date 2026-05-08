// Package server hosts the HTTP layer of the installer: a localhost-only
// listener with token auth, a handful of JSON endpoints, and an SSE stream
// for the install pipeline.
package server

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
)

// generateToken returns a 24-byte URL-safe random token. The installer prints
// the token-bearing URL once at startup; the user opens that URL in their
// browser, which is enough to authenticate every subsequent /api/* call.
func generateToken() string {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		panic(err)
	}
	return "oc_" + base64.RawURLEncoding.EncodeToString(buf)
}

// authMiddleware enforces the per-session token on /api/* requests. The SPA
// itself is served unauthenticated — the token in the URL is what gates
// access to the API surface.
func authMiddleware(token string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if len(r.URL.Path) < 5 || r.URL.Path[:5] != "/api/" {
			next.ServeHTTP(w, r)
			return
		}
		provided := r.Header.Get("X-OC-Token")
		if provided == "" {
			provided = r.URL.Query().Get("t")
		}
		if provided != token {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error":"unauthorized"}`))
			return
		}
		next.ServeHTTP(w, r)
	})
}
