# Solsclaw Installer

Single-binary cross-platform installer with a guided WebUI for [OpenClaw](https://github.com/openclaw/openclaw).
Defaults to [tensorix.ai](https://tensorix.ai) as the LLM backend; supports Anthropic, OpenAI, Gemini,
and the rest of OpenClaw's 60+ providers. Optionally installs the OpenAI-compatible gateway, Tailscale
remote access, and a Solana stack (CLI, x402 skill, USX skill).

The installer ships as a **single statically-linked binary** (~7 MB) — no Node.js, pnpm, fnm, xz, or
unzip on the target host. Just `curl`, `chmod +x`, run.

## Quickstart

**macOS / Linux:**

```bash
curl -fsSL https://raw.githubusercontent.com/SolsticeSauer/solsclaw_beta/main/scripts/install.sh | bash
```

**Windows (PowerShell):**

```powershell
irm https://raw.githubusercontent.com/SolsticeSauer/solsclaw_beta/main/scripts/install.ps1 | iex
```

The bootstrap script downloads the platform-specific binary, verifies its SHA-256 against the published
checksum, places it in `~/.solsclaw/solsclaw`, and starts it. The installer binds a localhost-only
HTTP server on a per-session token, opens your browser to the wizard, and writes
`~/.openclaw/openclaw.json` once you confirm. Re-run the same command later to change settings —
the wizard detects an existing config and switches into settings mode.

## What the installer does

1. Asks for the LLM provider, API key, default model, and workspace.
2. Optionally toggles:
   - **OpenAI-compatible gateway** on port 18789 with a generated shared-secret token.
   - **Tailscale** remote access (auth key or interactive login).
   - **Solana CLI** (Anza), **x402** skill, **USX** stablecoin skill.
3. Writes `~/.openclaw/openclaw.json` (atomic, with backup of any prior file).
4. Stores API keys via [99designs/keyring](https://github.com/99designs/keyring): macOS Keychain,
   Windows Credential Manager, Linux libsecret. Falls back to a 0600 file when no keychain is reachable.
5. Installs `@openclaw/cli` globally (preferring pnpm > bun > npm) and runs
   `openclaw onboard --install-daemon`.
6. Verifies with `openclaw doctor`.

## Repository layout

```
cmd/solsclaw/                Go entry point (main.go)
internal/
  platform/                  OS detection, paths
  installer/                 schema, providers, config IO, pipeline + steps
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

The `make build` flow runs the Vite UI build into `web/dist/`, then compiles the Go binary so the
`//go:embed` directive picks up the static assets.

## Security

- Server binds **only** to `127.0.0.1`.
- Every `/api/*` request requires a per-session token passed as `?t=…` and `X-OC-Token`.
- API keys never live in `openclaw.json`; the config stores opaque references and the daemon reads
  values via the OS keychain.
- Tailscale auth keys are zeroed from memory after `tailscale up` returns.
- External shell scripts (Anza Solana installer, Tailscale install.sh) are downloaded to a temp file,
  hashed, and logged before execution — never `curl … | sh`.
- Bootstrap scripts verify the SHA-256 of the downloaded binary against the published checksum.

## License

TBD.
