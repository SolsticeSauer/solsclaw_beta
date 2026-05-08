package main

import (
	"fmt"
	"io"
	"os"
	"runtime"
	"strings"
)

// printRemoteAccessHint emits a copy-paste-ready SSH tunnel command when the
// installer looks like it's running on a remote / headless host. The user
// then forwards the local listener port to their workstation and opens the
// same token-bearing URL in their local browser.
//
// Detection is intentionally generous: we'd rather suggest a tunnel that's
// not strictly needed than leave a server-only operator wondering how to
// reach the WebUI.
func printRemoteAccessHint(out io.Writer, port int) {
	if !looksRemote() {
		return
	}

	host := remoteHost()
	user := os.Getenv("USER")
	if user == "" {
		user = os.Getenv("USERNAME") // Windows fallback, still useful when SSHed in
	}
	if user == "" {
		user = "<your-ssh-user>"
	}

	target := fmt.Sprintf("%s@%s", user, host)
	fmt.Fprintln(out)
	fmt.Fprintln(out, "  Remote access?")
	fmt.Fprintln(out, "    Open this on your local machine to forward the WebUI port:")
	fmt.Fprintln(out)
	fmt.Fprintf(out, "      ssh -N -L %d:127.0.0.1:%d %s\n", port, port, target)
	fmt.Fprintln(out)
	fmt.Fprintln(out, "    Then open the URL above in your local browser. The token is valid")
	fmt.Fprintln(out, "    for this session regardless of where the request comes from.")
	fmt.Fprintln(out, "    (Tailscale will replace this once enabled in the wizard.)")
}

// looksRemote reports whether the current process is probably running on a
// machine the operator can't easily click on directly. Two strong signals:
//   - SSH_CONNECTION / SSH_TTY / SSH_CLIENT — the shell that launched us was
//     itself reached via SSH.
//   - We're on Linux without a graphical session (no DISPLAY/WAYLAND_DISPLAY),
//     a strong proxy for "this is a headless server".
func looksRemote() bool {
	if os.Getenv("SSH_CONNECTION") != "" ||
		os.Getenv("SSH_TTY") != "" ||
		os.Getenv("SSH_CLIENT") != "" {
		return true
	}
	if runtime.GOOS == "linux" &&
		os.Getenv("DISPLAY") == "" &&
		os.Getenv("WAYLAND_DISPLAY") == "" {
		return true
	}
	return false
}

// remoteHost returns the best guess for the address the operator should
// SSH to. SSH_CONNECTION is by far the most reliable source — its 3rd field
// is the server-side IP on the interface that accepted the inbound SSH
// connection, which is exactly what the operator needs in their tunnel
// command. If that's not available, fall back to the kernel hostname; that
// often resolves on a LAN and gives a placeholder otherwise.
func remoteHost() string {
	if conn := os.Getenv("SSH_CONNECTION"); conn != "" {
		fields := strings.Fields(conn)
		if len(fields) >= 3 && fields[2] != "" {
			return fields[2]
		}
	}
	if h, err := os.Hostname(); err == nil && h != "" {
		return h
	}
	return "<your-server>"
}
