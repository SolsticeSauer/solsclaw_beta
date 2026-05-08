# OpenClaw Universal Installer

Cross-platform installer with a guided WebUI for [OpenClaw](https://github.com/openclaw/openclaw).
Defaults to [tensorix.ai](https://tensorix.ai) as the LLM backend; supports Anthropic, OpenAI, Gemini,
and any of the 60+ providers OpenClaw understands. Optionally installs the OpenAI-compatible
gateway, Tailscale remote access, and a Solana stack (CLI, x402 skill, USX skill).

## Quickstart

**macOS / Linux:**

```bash
curl -fsSL https://raw.githubusercontent.com/SolsticeSauer/solsclaw_beta/main/scripts/install.sh | bash
```

**Windows (PowerShell):**

```powershell
irm https://raw.githubusercontent.com/SolsticeSauer/solsclaw_beta/main/scripts/install.ps1 | iex
```

The bootstrap script downloads the installer bundle, verifies its SHA-256, launches a local-only web
server bound to `127.0.0.1`, and opens your browser to the wizard. Re-run the same command later to
change settings — the wizard detects an existing config and switches into settings mode.

## What the installer does

1. Verifies Node.js ≥ 20 (installs via fnm/winget if missing).
2. Asks for the LLM provider, API key, default model, and workspace.
3. Optionally toggles:
   - **OpenAI-compatible gateway** on port 18789 with a generated shared-secret token.
   - **Tailscale** remote access (auth key or interactive login).
   - **Solana CLI** (Anza), **x402** skill, **USX** stablecoin skill.
4. Writes `~/.openclaw/openclaw.json` (atomic, with backup).
5. Stores API keys in the OS keychain (macOS Keychain / Windows Credential Manager / libsecret).
6. Installs `@openclaw/cli` globally and runs `openclaw onboard --install-daemon`.
7. Verifies with `openclaw doctor`.

## Repository layout

```
scripts/                     bootstrap scripts (install.sh, install.ps1)
packages/installer-server/   Fastify backend + pipeline steps
packages/installer-ui/       React + Vite wizard frontend
.github/workflows/           CI matrix + release pipeline
```

## Local development

```bash
pnpm install
pnpm dev          # starts the Fastify server and Vite dev UI in parallel
pnpm build        # builds the UI into installer-server/public and compiles TS
pnpm typecheck
pnpm test
```

## Security

- Server binds **only** to `127.0.0.1`.
- Every `/api/*` request requires a per-session token passed as `?t=…` and `X-OC-Token`.
- API keys never live in `openclaw.json`; the config stores opaque references and the daemon reads
  values via the OS keychain.
- Tailscale auth keys are zeroed from memory after `tailscale up` returns.
- Bootstrap scripts verify the SHA-256 of every downloaded artifact against the published checksum.

## License

TBD.
