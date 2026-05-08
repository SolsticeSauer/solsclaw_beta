package server

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"strings"
	"time"
)

// Started describes a running installer instance.
type Started struct {
	URL    string
	Token  string
	Port   int
	server *http.Server
}

// Close shuts the server down with a short grace period.
func (s *Started) Close(ctx context.Context) error {
	shutdownCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return s.server.Shutdown(shutdownCtx)
}

// Options controls how Start binds the listener.
type Options struct {
	// Port preferred. If 0 or already taken, the next free port is used.
	Port int
	// UI is the embedded SPA filesystem (typically web/embed.go's content).
	UI fs.FS
	// InstallerVersion is stamped into openclaw.json.
	InstallerVersion string
	// ShutdownRequested receives a single value when the UI's Quit button
	// is clicked (POST /api/shutdown). main listens on it and runs the
	// same graceful-close path as a SIGINT.
	ShutdownRequested chan<- struct{}
}

// Start binds a localhost listener, mounts the SPA + API routes behind a
// per-session token, and returns once the listener is accepting connections.
// Always binds to 127.0.0.1; never to a public interface.
func Start(opts Options) (*Started, error) {
	listener, err := bindLocalhost(opts.Port)
	if err != nil {
		return nil, err
	}
	port := listener.Addr().(*net.TCPAddr).Port

	mux := http.NewServeMux()
	registerRoutes(mux, Deps{
		InstallerVersion:  opts.InstallerVersion,
		ShutdownRequested: opts.ShutdownRequested,
	})

	uiHandler := newUIHandler(opts.UI)
	mux.Handle("/", uiHandler)

	token := generateToken()
	handler := authMiddleware(token, mux)

	srv := &http.Server{
		Handler:      handler,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 0, // SSE streams may live a long time.
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		_ = srv.Serve(listener)
	}()

	return &Started{
		URL:    fmt.Sprintf("http://127.0.0.1:%d/?t=%s", port, token),
		Token:  token,
		Port:   port,
		server: srv,
	}, nil
}

func bindLocalhost(preferred int) (net.Listener, error) {
	if preferred > 0 {
		listener, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", preferred))
		if err == nil {
			return listener, nil
		}
		if !errors.Is(err, errAddrInUse(err)) {
			// fall through to OS-assigned anyway; preferred-port failure
			// shouldn't crash the installer.
		}
	}
	return net.Listen("tcp", "127.0.0.1:0")
}

// errAddrInUse loosens the syscall.EADDRINUSE check so we don't pull in
// platform-specific dependencies just to recognise "port busy".
func errAddrInUse(err error) error {
	if err == nil {
		return nil
	}
	if strings.Contains(err.Error(), "address already in use") {
		return err
	}
	return nil
}
