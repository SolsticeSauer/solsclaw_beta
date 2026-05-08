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
NODE_LINE="${OPENCLAW_INSTALLER_NODE_LINE:-latest-v22.x}"
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
  for cmd in curl tar awk; do
    command -v "$cmd" >/dev/null 2>&1 || die "Required tool '$cmd' is missing. Please install it and retry."
  done
  if ! command -v shasum >/dev/null 2>&1 && ! command -v sha256sum >/dev/null 2>&1; then
    die "Neither shasum nor sha256sum found. Install coreutils."
  fi
  # Node tarballs for Linux are .tar.xz only; macOS also gets xz. xz-utils is
  # default on most distros but missing on minimal containers.
  if ! command -v xz >/dev/null 2>&1; then
    if [ "$(uname -s)" = Linux ]; then
      die "Required tool 'xz' is missing. Install with: sudo apt install xz-utils  (or: yum/dnf install xz)"
    else
      die "Required tool 'xz' is missing. Install xz and retry."
    fi
  fi
}

sha256_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    sha256sum "$1" | awk '{print $1}'
  fi
}

# Downloads an LTS Node distribution from nodejs.org and unpacks it under
# $INSTALL_HOME/runtime/node. Avoids fnm/nvm to keep the dependency surface
# minimal (no unzip, no shell-rc edits).
ensure_node() {
  if command -v node >/dev/null 2>&1; then
    local current
    current="$(node -p 'process.versions.node.split(".")[0]')"
    if [ "$current" -ge "$MIN_NODE_MAJOR" ]; then
      log "Found Node $(node -v)."
      return
    fi
    warn "Node $(node -v) found but minimum is v${MIN_NODE_MAJOR}; installing portable Node alongside."
  else
    log "Node.js not found; downloading portable Node ${NODE_LINE}."
  fi

  local node_os node_arch
  case "$(uname -s)" in
    Darwin) node_os=darwin ;;
    Linux)  node_os=linux ;;
    *) die "Unsupported OS for Node bootstrap: $(uname -s)" ;;
  esac
  case "$(uname -m)" in
    x86_64|amd64) node_arch=x64 ;;
    arm64|aarch64) node_arch=arm64 ;;
    *) die "Unsupported architecture for Node bootstrap: $(uname -m)" ;;
  esac

  local base="https://nodejs.org/dist/${NODE_LINE}"
  local tmp
  tmp="$(mktemp -d)"
  trap "rm -rf '$tmp'" EXIT

  log "Resolving Node release from $base..."
  curl -fsSL "$base/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"

  local pattern="${node_os}-${node_arch}.tar.xz"
  local filename expected_sha
  filename="$(awk -v p="$pattern" '$2 ~ p { print $2; exit }' "$tmp/SHASUMS256.txt")"
  [ -n "$filename" ] || die "No Node tarball matching ${pattern} in ${NODE_LINE}."
  expected_sha="$(awk -v f="$filename" '$2 == f { print $1 }' "$tmp/SHASUMS256.txt")"

  log "Downloading $filename..."
  curl -fsSL "$base/$filename" -o "$tmp/node.tar.xz"
  local actual_sha
  actual_sha="$(sha256_file "$tmp/node.tar.xz")"
  [ "$actual_sha" = "$expected_sha" ] || die "Node checksum mismatch.\n  expected: $expected_sha\n  actual:   $actual_sha"

  local node_root="$INSTALL_HOME/runtime/node"
  rm -rf "$node_root"
  mkdir -p "$node_root"
  tar -xJf "$tmp/node.tar.xz" -C "$node_root" --strip-components=1

  export PATH="$node_root/bin:$PATH"
  log "Using portable Node $(node -v) at $node_root."
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
