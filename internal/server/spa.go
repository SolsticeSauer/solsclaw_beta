package server

import (
	"errors"
	"io"
	"io/fs"
	"net/http"
	"path"
	"strings"
)

// newUIHandler serves the embedded UI build. Anything not found falls back
// to index.html so client-side routing works on hard refresh; /api/* paths
// are excluded so a missing API endpoint surfaces as a real 404.
func newUIHandler(uiFS fs.FS) http.Handler {
	fileServer := http.FileServer(http.FS(uiFS))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			http.NotFound(w, r)
			return
		}

		// If the requested file exists in the embed FS, serve it directly.
		// Otherwise fall back to index.html for the SPA.
		clean := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if clean == "" {
			clean = "index.html"
		}
		if f, err := uiFS.Open(clean); err == nil {
			_ = f.Close()
			fileServer.ServeHTTP(w, r)
			return
		} else if !errors.Is(err, fs.ErrNotExist) {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// SPA fallback.
		index, err := uiFS.Open("index.html")
		if err != nil {
			http.Error(w, "index.html missing from build", http.StatusNotFound)
			return
		}
		defer index.Close()
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = io.Copy(w, index)
	})
}
