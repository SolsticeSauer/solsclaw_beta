# Solsclaw Installer

Single-binary cross-platform installer with a guided WebUI for
[OpenClaw](https://github.com/openclaw/openclaw). Defaults to
[tensorix.ai](https://tensorix.ai) as the LLM backend; supports Anthropic,
OpenAI, Google Gemini, and the rest of OpenClaw's 60+ providers. Optionally
installs the OpenAI-compatible gateway, Tailscale remote access, and a
Solana stack (CLI, x402 skill, USX skill).

The installer ships as a **single statically-linked binary (~7 MB)** — no
Node.js, pnpm, fnm, xz, or unzip required on the target host. Just `curl`,
`chmod +x`, run.

## Quickstart (native install)

**macOS / Linux:**

```bash
curl -fsSL https://raw.githubusercontent.com/SolsticeSauer/solsclaw_beta/main/scripts/install.sh | bash
```

**Windows (PowerShell):**

```powershell
irm https://raw.githubusercontent.com/SolsticeSauer/solsclaw_beta/main/scripts/install.ps1 | iex
```

The bootstrap script downloads the platform-specific binary, verifies its
SHA-256, places it at `~/.solsclaw/solsclaw`, and starts it. The installer
binds a localhost-only HTTP server on a per-session token, opens your browser
to the wizard, and writes `~/.openclaw/openclaw.json` once you confirm.
Re-run the same command later to change settings — the wizard detects an
existing config and switches into settings mode.

If you SSH into a remote host the installer prints a copy-paste-ready SSH
tunnel command so you can reach the WebUI from your local browser.

## Install modes

The wizard's second step asks how you want OpenClaw to run:

### Native (recommended)

Installs OpenClaw directly on the host:

- A portable Node 22 LTS is downloaded under `~/.solsclaw/runtime/node` if
  the system doesn't already have one.
- `openclaw` is `npm install`-ed globally.
- The gateway daemon is registered with launchd (macOS), systemd user units
  (Linux) or Windows Services.
- Full access to host-integration skills: AppleScript, iMessage, system
  notifications, etc.

### Docker (sandboxed)

Generates a Dockerfile + `docker-compose.yml` under `~/.solsclaw/docker/`,
builds the image locally, and runs OpenClaw in a container with state
mounted as a volume. Tailscale, when enabled, becomes a sidecar service per
the [official Tailscale + Docker guide](https://tailscale.com/docs/features/containers/docker/how-to/connect-docker-container).

Pick this when you want clean isolation, easy backups (one folder), and
trivial uninstall (`docker compose down -v`). **You must install Docker
yourself before running the wizard** — the installer does not provision the
Docker engine.

The wizard warns macOS users that picking Docker disables the macOS-host
integration skills (Apple Notes, Reminders, iMessage, voice wake, menu bar
app), since those rely on AppleScript / system frameworks that don't exist
inside a Linux container.

## Installing Docker per platform

Skip this section if you chose Native mode.

### macOS

[Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
includes Compose and works on both Apple Silicon and Intel:

```bash
brew install --cask docker
open -a Docker      # start the desktop app once to finish setup
docker compose version
```

Or download the .dmg directly from the link above.

### Linux (Ubuntu / Debian)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
newgrp docker        # pick up the group change in this shell
docker compose version
```

For other distros see the
[official install instructions](https://docs.docker.com/engine/install/).
The Compose plugin is bundled with modern Docker CE; if it isn't, install
`docker-compose-plugin` from your distro package manager.

If you intend to use the **Tailscale sidecar**, your kernel needs `tun`
support and the container needs `NET_ADMIN`. Both are present by default on
mainstream Linux servers; on locked-down hosts add `--privileged` is *not*
the answer — adjust `cap_add` in the generated compose file or run the
container in userspace mode.

### Windows

Install [Docker Desktop for
Windows](https://docs.docker.com/desktop/install/windows-install/) and
enable WSL2 integration. Run the installer from inside your WSL2 distro
rather than from native Windows; OpenClaw is much happier under WSL2 either
way.

```powershell
winget install Docker.DockerDesktop
```

## What the installer does

| Step | Native | Docker |
|------|--------|--------|
| Persist API key in OS keychain | yes | yes |
| Write `openclaw.json` (atomic, with backup) | `~/.openclaw/openclaw.json` | `~/.solsclaw/docker/openclaw-data/openclaw.json` |
| Bring Node + npm onto PATH | downloads portable Node 22 if missing | baked into the image |
| `npm install -g openclaw@latest` | yes | inside the image build |
| Register daemon | launchd / systemd / win-svc | container with `restart: unless-stopped` |
| OpenAI-compatible gateway endpoint | toggles on `gateway.http.endpoints.chatCompletions.enabled` and restarts daemon | same flag, plus `127.0.0.1:18789` published in compose |
| Tailscale | host install (brew / install.sh / winget) + `tailscale up` | `tailscale/tailscale` sidecar with `network_mode: service:tailscale` on the OpenClaw service |
| Solana CLI / x402 / USX skills | installed on the host | currently host-only — add to the Dockerfile manually if needed |
| Verify | `openclaw doctor` | `docker compose exec openclaw openclaw doctor` |

External shell scripts (Anza Solana installer, Tailscale install.sh) are
downloaded to a temp file, hashed, and logged before execution — never
`curl … | sh`.

## Repository layout

```
cmd/solsclaw/                Go entry point (main.go + remote-access hint)
internal/
  platform/                  OS detection, paths
  installer/                 schema, providers, config IO, pipeline + steps
  installer/docker/          Dockerfile + compose templates
  installer/steps/           one file per pipeline operation
  secrets/                   keychain wrapper (with 0600-file fallback)
  server/                    HTTP layer (auth, routes, SSE, SPA fallback)
web/
  embed.go                   //go:embed for the compiled UI bundle
  dist/                      vite output (gitignored, populated at build)
packages/installer-ui/       React + Vite sources (TypeScript)
scripts/                     bootstrap (install.sh, install.ps1)
.github/workflows/           CI + release pipeline
Makefile                     dev orchestration
```

## Local development

Prereqs: Go 1.24+, Node 22+, pnpm 11+.

```bash
pnpm install
make build              # UI → web/dist → embedded into solsclaw binary
./solsclaw              # start, open browser

make dev                # Vite UI dev server with HMR (proxies /api to the running solsclaw)
make release-local      # cross-compile all 5 platforms into dist-bin/
make vet test           # static analysis + unit tests
```

The `make build` target runs the Vite UI build into `web/dist/`, then
compiles the Go binary so the `//go:embed` directive picks up the static
assets.

## Security

- Server binds **only** to `127.0.0.1`.
- Every `/api/*` request requires a per-session token passed as `?t=…` and
  `X-OC-Token`.
- API keys never live in `openclaw.json` long-term — the config carries the
  key inline today (a known trade-off; see the issues list); separately the
  installer also stores it in the OS keychain (macOS Keychain, Windows
  Credential Manager, libsecret on Linux) via
  [99designs/keyring](https://github.com/99designs/keyring), with a 0600
  file fallback for headless installs.
- Tailscale auth keys are zeroed from memory after `tailscale up` (native)
  or after the compose `.env` is written (Docker).
- Bootstrap scripts verify the SHA-256 of every downloaded artifact against
  the published checksum.

## License

TBD.
