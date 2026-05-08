#!/usr/bin/env bash
# Solsclaw Installer Bootstrap (macOS / Linux)
#
# Downloads a single statically-linked binary and runs it. No Node, no pnpm,
# no xz dependency — only POSIX sh, curl, and shasum/sha256sum.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/SolsticeSauer/solsclaw_beta/main/scripts/install.sh | bash
#
# Honors:
#   SOLSCLAW_VERSION  (default: latest)
#   SOLSCLAW_HOME     (default: $HOME/.solsclaw)
#   SOLSCLAW_REPO     (default: SolsticeSauer/solsclaw_beta)
#   SOLSCLAW_NO_OPEN  (skip auto-launching the browser)

set -eu

REPO="${SOLSCLAW_REPO:-SolsticeSauer/solsclaw_beta}"
VERSION="${SOLSCLAW_VERSION:-latest}"
INSTALL_HOME="${SOLSCLAW_HOME:-$HOME/.solsclaw}"

log()  { printf '\033[1;36m[solsclaw]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[solsclaw]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[solsclaw]\033[0m %s\n' "$*" >&2; exit 1; }

ensure_tooling() {
  command -v curl >/dev/null 2>&1 || die "curl is required."
  if ! command -v shasum >/dev/null 2>&1 && ! command -v sha256sum >/dev/null 2>&1; then
    die "Need shasum or sha256sum. Install coreutils."
  fi
}

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

detect_platform() {
  uname_s="$(uname -s)"
  uname_m="$(uname -m)"
  case "$uname_s" in
    Darwin) os=darwin ;;
    Linux)  os=linux ;;
    *)      die "Unsupported OS: $uname_s" ;;
  esac
  case "$uname_m" in
    x86_64|amd64)   arch=amd64 ;;
    arm64|aarch64)  arch=arm64 ;;
    *)              die "Unsupported architecture: $uname_m" ;;
  esac
  echo "${os}-${arch}"
}

resolve_url() {
  platform="$1"
  if [ "$VERSION" = "latest" ]; then
    echo "https://github.com/${REPO}/releases/latest/download/solsclaw-${platform}"
  else
    echo "https://github.com/${REPO}/releases/download/${VERSION}/solsclaw-${platform}"
  fi
}

main() {
  ensure_tooling

  platform="$(detect_platform)"
  binary_url="$(resolve_url "$platform")"
  checksum_url="${binary_url}.sha256"

  mkdir -p "$INSTALL_HOME"
  target="$INSTALL_HOME/solsclaw"
  tmp_bin="${target}.tmp.$$"

  log "Downloading solsclaw (${platform})..."
  if ! curl -fsSL "$binary_url" -o "$tmp_bin"; then
    rm -f "$tmp_bin"
    die "Failed to download $binary_url"
  fi

  log "Verifying checksum..."
  expected="$(curl -fsSL "$checksum_url" | awk '{print $1}')"
  actual="$(sha256_file "$tmp_bin")"
  if [ "$expected" != "$actual" ]; then
    rm -f "$tmp_bin"
    die "Checksum mismatch.
  expected: $expected
  actual:   $actual"
  fi

  chmod +x "$tmp_bin"
  mv "$tmp_bin" "$target"
  log "Installed to $target"

  if [ "${SOLSCLAW_NO_OPEN:-0}" = "1" ]; then
    exec "$target" --no-open
  else
    exec "$target"
  fi
}

main "$@"
