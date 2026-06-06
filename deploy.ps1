param(
  [int]$Port = 4173,
  [switch]$SkipPython
)

$ErrorActionPreference = "Stop"

function Require-Command($Name, $InstallHint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Write-Host "Missing command: $Name" -ForegroundColor Red
    Write-Host $InstallHint
    exit 1
  }
}

Write-Host "== CSP Visual Chat deploy ==" -ForegroundColor Cyan
Require-Command "node" "Install Node.js 20+ from https://nodejs.org/"
Require-Command "npm" "Install Node.js 20+ from https://nodejs.org/"

New-Item -ItemType Directory -Force -Path "data" | Out-Null
New-Item -ItemType Directory -Force -Path "public/assets/uploads" | Out-Null
New-Item -ItemType Directory -Force -Path "outputs" | Out-Null

Write-Host "Installing Node workflow..." -ForegroundColor Cyan
npm install

if (-not $SkipPython) {
  if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "Installing optional Python cutout dependencies..." -ForegroundColor Cyan
    python -m pip install -r requirements.txt
  } else {
    Write-Host "Python not found. Skipping high-quality cutout dependencies." -ForegroundColor Yellow
  }
}

$env:PORT = "$Port"
Write-Host ""
Write-Host "Ready: http://localhost:$Port" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server."
npm start
