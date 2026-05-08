# Solsclaw Installer Bootstrap (Windows)
#
# Downloads a single static binary (solsclaw-windows-amd64.exe) and runs it.
# No Node.js, no pnpm — pure PowerShell.
#
# Usage:
#   irm https://raw.githubusercontent.com/SolsticeSauer/solsclaw_beta/main/scripts/install.ps1 | iex
#
# Honors:
#   $env:SOLSCLAW_VERSION (default: latest)
#   $env:SOLSCLAW_HOME    (default: $HOME\.solsclaw)
#   $env:SOLSCLAW_REPO    (default: SolsticeSauer/solsclaw_beta)
#   $env:SOLSCLAW_NO_OPEN (skip auto-launching the browser)

#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$Repo        = if ($env:SOLSCLAW_REPO)    { $env:SOLSCLAW_REPO }    else { 'SolsticeSauer/solsclaw_beta' }
$Version     = if ($env:SOLSCLAW_VERSION) { $env:SOLSCLAW_VERSION } else { 'latest' }
$InstallHome = if ($env:SOLSCLAW_HOME)    { $env:SOLSCLAW_HOME }    else { Join-Path $HOME '.solsclaw' }

function Write-Info($msg)        { Write-Host "[solsclaw] $msg" -ForegroundColor Cyan }
function Stop-WithError($msg)    { Write-Host "[solsclaw] $msg" -ForegroundColor Red; exit 1 }

function Get-Architecture {
  switch ($env:PROCESSOR_ARCHITECTURE) {
    'AMD64' { return 'amd64' }
    'ARM64' { return 'arm64' }
    default { Stop-WithError "Unsupported architecture: $env:PROCESSOR_ARCHITECTURE" }
  }
}

function Resolve-Url($platform) {
  if ($Version -eq 'latest') {
    return "https://github.com/$Repo/releases/latest/download/solsclaw-$platform.exe"
  }
  return "https://github.com/$Repo/releases/download/$Version/solsclaw-$platform.exe"
}

$arch     = Get-Architecture
$platform = "windows-$arch"
$binUrl   = Resolve-Url $platform
$shaUrl   = "$binUrl.sha256"

if (-not (Test-Path $InstallHome)) { New-Item -ItemType Directory -Path $InstallHome | Out-Null }
$target = Join-Path $InstallHome 'solsclaw.exe'

Write-Info "Downloading solsclaw ($platform)..."
$tmp = "$target.tmp.$PID"
try {
  Invoke-WebRequest -Uri $binUrl -OutFile $tmp -UseBasicParsing

  Write-Info 'Verifying checksum...'
  $expected = ((Invoke-WebRequest -Uri $shaUrl -UseBasicParsing).Content -split '\s+')[0].Trim().ToLower()
  $actual = (Get-FileHash -Algorithm SHA256 $tmp).Hash.ToLower()
  if ($expected -ne $actual) {
    Stop-WithError "Checksum mismatch. expected=$expected actual=$actual"
  }

  Move-Item -Force $tmp $target
} finally {
  if (Test-Path $tmp) { Remove-Item -Force $tmp }
}

Write-Info "Installed to $target"

$args = @()
if ($env:SOLSCLAW_NO_OPEN -eq '1') { $args += '--no-open' }
& $target @args
