# OpenClaw Universal Installer Bootstrap (Windows)
#
# Usage:
#   irm https://raw.githubusercontent.com/SolsticeSauer/solsclaw_beta/main/scripts/install.ps1 | iex
#
# Honors environment variables:
#   $env:OPENCLAW_INSTALLER_VERSION (default: latest)
#   $env:OPENCLAW_INSTALLER_HOME    (default: $HOME\.openclaw-installer)
#   $env:OPENCLAW_INSTALLER_REPO    (default: SolsticeSauer/solsclaw_beta)
#   $env:OPENCLAW_INSTALLER_NO_OPEN (skip auto-launching the browser)

#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$Repo = if ($env:OPENCLAW_INSTALLER_REPO) { $env:OPENCLAW_INSTALLER_REPO } else { 'SolsticeSauer/solsclaw_beta' }
$Version = if ($env:OPENCLAW_INSTALLER_VERSION) { $env:OPENCLAW_INSTALLER_VERSION } else { 'latest' }
$InstallHome = if ($env:OPENCLAW_INSTALLER_HOME) { $env:OPENCLAW_INSTALLER_HOME } else { Join-Path $HOME '.openclaw-installer' }
$MinNodeMajor = 20

function Write-Info($msg) { Write-Host "[openclaw] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[openclaw] $msg" -ForegroundColor Yellow }
function Stop-WithError($msg) { Write-Host "[openclaw] $msg" -ForegroundColor Red; exit 1 }

function Get-Architecture {
  switch ($env:PROCESSOR_ARCHITECTURE) {
    'AMD64' { return 'x64' }
    'ARM64' { return 'arm64' }
    default { Stop-WithError "Unsupported architecture: $env:PROCESSOR_ARCHITECTURE" }
  }
}

function Test-WSL2 {
  try {
    $null = Get-Command wsl -ErrorAction Stop
    $output = wsl --status 2>$null
    if ($LASTEXITCODE -eq 0) { return $true }
  } catch {}
  return $false
}

function Confirm-NativeWindows {
  Write-Warn 'OpenClaw recommends running under WSL2 on Windows for full feature parity.'
  Write-Warn 'You can continue with native Windows (experimental) or abort and re-run inside WSL2.'
  $reply = Read-Host 'Continue with native Windows install? [y/N]'
  if ($reply -notmatch '^[Yy]') { Stop-WithError 'Aborted by user. Re-run from inside WSL2.' }
}

function Ensure-Node {
  $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
  if ($nodeCmd) {
    $major = (& node -p 'process.versions.node.split(".")[0]')
    if ([int]$major -ge $MinNodeMajor) {
      Write-Info "Found Node $(& node -v)."
      return
    }
    Write-Warn "Node $(& node -v) found but minimum is v$MinNodeMajor; installing latest LTS via winget."
  } else {
    Write-Info 'Node.js not found; installing latest LTS via winget.'
  }

  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) { Stop-WithError 'winget is required to install Node.js automatically. Install Node 20+ manually and retry.' }

  & winget install --silent --accept-source-agreements --accept-package-agreements --id OpenJS.NodeJS.LTS
  if ($LASTEXITCODE -ne 0) { Stop-WithError 'winget failed to install Node.js.' }
}

function Resolve-ReleaseUrl($platform) {
  if ($Version -eq 'latest') {
    return "https://github.com/$Repo/releases/latest/download/installer-$platform.tar.gz"
  }
  return "https://github.com/$Repo/releases/download/$Version/installer-$platform.tar.gz"
}

function Download-And-Verify($platform, $url) {
  $checksumUrl = $url -replace '\.tar\.gz$', '.sha256'
  $tmp = New-Item -ItemType Directory -Path (Join-Path $env:TEMP "openclaw-$([guid]::NewGuid())")
  try {
    $tarball = Join-Path $tmp 'installer.tar.gz'
    $checksum = Join-Path $tmp 'installer.sha256'

    Write-Info "Downloading installer ($platform)..."
    Invoke-WebRequest -Uri $url -OutFile $tarball -UseBasicParsing
    Invoke-WebRequest -Uri $checksumUrl -OutFile $checksum -UseBasicParsing

    $expected = (Get-Content $checksum -Raw).Split(' ')[0].Trim()
    $actual = (Get-FileHash -Algorithm SHA256 $tarball).Hash.ToLower()
    if ($expected.ToLower() -ne $actual) {
      Stop-WithError "Checksum mismatch. expected=$expected actual=$actual"
    }
    Write-Info 'Checksum verified.'

    if (-not (Test-Path $InstallHome)) { New-Item -ItemType Directory -Path $InstallHome | Out-Null }

    # Native PowerShell tar (Windows 10 1803+)
    & tar -xzf $tarball -C $InstallHome
    if ($LASTEXITCODE -ne 0) { Stop-WithError 'Failed to extract installer tarball.' }
  } finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
  }
}

function Start-Installer {
  $entry = Join-Path $InstallHome 'bin\installer.js'
  if (-not (Test-Path $entry)) { Stop-WithError "Installer entry point missing at $entry" }

  Write-Info 'Starting installer...'
  $args = @($entry)
  if ($env:OPENCLAW_INSTALLER_NO_OPEN -eq '1') { $args += '--no-open' }
  & node @args
}

# ----- Main -----
$arch = Get-Architecture
$platform = "win-$arch"

if (-not (Test-WSL2)) {
  Confirm-NativeWindows
} else {
  Write-Info 'WSL2 detected. For best results consider running install.sh from inside WSL2 instead.'
}

Ensure-Node
$tarballUrl = Resolve-ReleaseUrl $platform
Download-And-Verify $platform $tarballUrl
Start-Installer
