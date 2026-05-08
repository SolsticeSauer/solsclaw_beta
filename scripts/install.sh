#!/usr/bin/env bash
# OpenClaw Universal Installer Bootstrap (macOS / Linux)
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/SolsticeSauer/solsclaw_beta/main/scripts/install.sh | bash
#
# Honors:
#   OPENCLAW_INSTALLER_VERSION (default: latest)
#   OPENCLAW_INSTALLER_HOME    (default: $HOME/.openclaw-installer)
#   OPENCLAW_INSTALLER_REPO    (default: SolsticeSauer/solsclaw_beta)
#   OPENCLAW_INSTALLER_NO_OPEN (skip auto-launching the browser)

set -euo pipefail

REPO="${OPENCLAW_INSTALLER_REPO:-SolsticeSauer/solsclaw_beta}"
VERSION="${OPENCLAW_INSTALLER_VERSION:-latest}"
INSTALL_HOME="${OPENCLAW_INSTALLER_HOME:-$HOME/.openclaw-installer}"
MIN_NODE_MAJOR=20

log()  { printf '\033[1;36m[openclaw]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[openclaw]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[openclaw]\033[0m %s\n' "$*" >&2; exit 1; }

detect_platform() {
  local uname_s uname_m os arch
  uname_s="$(uname -s)"
  uname_m="$(uname -m)"
  case "$uname_s" in
    Darwin) os=darwin ;;
    Linux)  os=linux ;;
    *)      die "Unsupported OS: $uname_s" ;;
  esac
  case "$uname_m" in
    x86_64|amd64) arch=x64 ;;
    arm64|aarch64) arch=arm64 ;;
    *) die "Unsupported architecture: $uname_m" ;;
  esac
  echo "${os}-${arch}"
}

ensure_tooling() {
  for cmd in curl tar shasum; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      # macOS ships shasum; Linux usually has sha256sum instead
      if [ "$cmd" = shasum ] && command -v sha256sum >/dev/null 2>&1; then
        continue
      fi
      die "Required tool '$cmd' is missing. Please install it and retry."
    fi
  done
}

sha256_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    sha256sum "$1" | awk '{print $1}'
  fi
}

ensure_node() {
  if command -v node >/dev/null 2>&1; then
    local current
    current="$(node -p 'process.versions.node.split(".")[0]')"
    if [ "$current" -ge "$MIN_NODE_MAJOR" ]; then
      log "Found Node $(node -v)."
      return
    fi
    warn "Node $(node -v) found but minimum is v${MIN_NODE_MAJOR}; installing fnm-managed Node."
  else
    log "Node.js not found; installing fnm to manage it locally."
  fi

  if ! command -v fnm >/dev/null 2>&1; then
    curl -fsSL https://fnm.vercel.app/install | bash -s -- --skip-shell --install-dir "$INSTALL_HOME/fnm"
    export PATH="$INSTALL_HOME/fnm:$PATH"
  fi
  eval "$(fnm env --shell bash)"
  fnm install --lts
  fnm use --lts
}

resolve_release_url() {
  local platform="$1"
  if [ "$VERSION" = "latest" ]; then
    echo "https://github.com/${REPO}/releases/latest/download/installer-${platform}.tar.gz"
  else
    echo "https://github.com/${REPO}/releases/download/${VERSION}/installer-${platform}.tar.gz"
  fi
}

download_and_verify() {
  local platform="$1"
  local tarball_url="$2"
  local checksum_url="${tarball_url%.tar.gz}.sha256"
  local tmp
  tmp="$(mktemp -d)"
  trap "rm -rf '$tmp'" EXIT

  log "Downloading installer (${platform})..."
  curl -fsSL "$tarball_url" -o "$tmp/installer.tar.gz"
  curl -fsSL "$checksum_url" -o "$tmp/installer.sha256"

  local expected actual
  expected="$(awk '{print $1}' "$tmp/installer.sha256")"
  actual="$(sha256_file "$tmp/installer.tar.gz")"
  if [ "$expected" != "$actual" ]; then
    die "Checksum mismatch.\n  expected: $expected\n  actual:   $actual"
  fi
  log "Checksum verified."

  mkdir -p "$INSTALL_HOME"
  tar -xzf "$tmp/installer.tar.gz" -C "$INSTALL_HOME"
}

launch_installer() {
  local entry="$INSTALL_HOME/bin/installer.js"
  [ -f "$entry" ] || die "Installer entry point missing at $entry"

  log "Starting installer..."
  if [ "${OPENCLAW_INSTALLER_NO_OPEN:-0}" = "1" ]; then
    exec node "$entry" --no-open
  else
    exec node "$entry"
  fi
}

main() {
  ensure_tooling
  ensure_node

  local platform tarball_url
  platform="$(detect_platform)"
  tarball_url="$(resolve_release_url "$platform")"

  download_and_verify "$platform" "$tarball_url"
  launch_installer
}

main "$@"
