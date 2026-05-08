// solsclaw is a single-binary installer + WebUI for OpenClaw. It runs a
// localhost-only HTTP server, opens the user's browser, and walks them
// through configuring tensorix.ai (default), an LLM provider, and any
// optional add-ons (OpenAI gateway, Tailscale, Solana stack).
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/SolsticeSauer/solsclaw_beta/internal/server"
	"github.com/SolsticeSauer/solsclaw_beta/web"
)

// version is overwritten at build time via -ldflags "-X main.version=…".
var version = "dev"

func main() {
	port := flag.Int("port", 7842, "preferred local port (falls back to OS-assigned if busy)")
	noOpen := flag.Bool("no-open", false, "skip launching the browser automatically")
	flag.Parse()

	// Buffered so a Quit-click during shutdown propagation doesn't panic
	// on a closed channel; the receiver pattern only consumes once.
	shutdownCh := make(chan struct{}, 1)

	started, err := server.Start(server.Options{
		Port:              *port,
		UI:                web.FS(),
		InstallerVersion:  version,
		ShutdownRequested: shutdownCh,
	})
	if err != nil {
		log.Fatalf("failed to start installer: %v", err)
	}

	fmt.Printf("\n  Solsclaw Installer ready at:\n    %s\n\n", started.URL)
	fmt.Println("  Use the wizard to set up OpenClaw. When you're done:")
	fmt.Println("    • click Quit on the Home page (graceful shutdown), or")
	fmt.Println("    • press Ctrl+C in this terminal.")
	fmt.Println("  The session token is single-use; restart for a fresh one.")

	printRemoteAccessHint(os.Stdout, started.Port)
	fmt.Println()

	if !*noOpen && !looksRemote() {
		// Skip the browser launch on remote/headless boxes — xdg-open on a
		// server with no display just prints an unhelpful error.
		if err := openBrowser(started.URL); err != nil {
			fmt.Fprintf(os.Stderr, "Could not open browser automatically: %v\n", err)
		}
	}

	// Wait for SIGINT/SIGTERM (Ctrl+C) OR a UI Quit click, then shut down.
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	select {
	case <-sigs:
		fmt.Println("\n  Caught signal, shutting down…")
	case <-shutdownCh:
		fmt.Println("\n  Quit requested from UI, shutting down…")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := started.Close(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "shutdown error: %v\n", err)
	}
	fmt.Println("  Bye.")
}

// openBrowser launches the user's default browser pointed at the installer.
// Best-effort only — if the user is on a headless server they can copy the
// URL by hand.
func openBrowser(url string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	return cmd.Start()
}
