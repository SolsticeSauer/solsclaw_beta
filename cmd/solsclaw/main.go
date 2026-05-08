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

	started, err := server.Start(server.Options{
		Port:             *port,
		UI:               web.FS(),
		InstallerVersion: version,
	})
	if err != nil {
		log.Fatalf("failed to start installer: %v", err)
	}

	fmt.Printf("\n  Solsclaw Installer ready at:\n    %s\n\n", started.URL)
	fmt.Printf("  (Press Ctrl+C to exit. The token is single-session and is regenerated next start.)\n\n")

	if !*noOpen {
		if err := openBrowser(started.URL); err != nil {
			fmt.Fprintf(os.Stderr, "Could not open browser automatically: %v\n", err)
		}
	}

	// Wait for SIGINT/SIGTERM, then shut down gracefully.
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	<-sigs

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := started.Close(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "shutdown error: %v\n", err)
	}
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
