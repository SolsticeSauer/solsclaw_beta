// Package web exposes the compiled UI build as an embedded filesystem so
// the installer ships as a single binary. The dist/ directory is populated
// by `pnpm --filter installer-ui build` (output is redirected here via the
// Makefile / release pipeline).
package web

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var distFS embed.FS

// FS returns a filesystem rooted at the SPA's index.html, ready to be passed
// directly to http.FileServer or net/http.FS.
func FS() fs.FS {
	sub, err := fs.Sub(distFS, "dist")
	if err != nil {
		panic("web/dist embed missing — run the UI build before `go build`")
	}
	return sub
}
