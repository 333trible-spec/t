# Start app + tunnel (deal-card-bg local server)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

Write-Host '=== deal-card-bg: local server ===' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'start-app.ps1')
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ''
Write-Host '=== HTTPS tunnel (localtunnel) ===' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'start-tunnel-localtunnel.ps1')
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
  Write-Host ''
  Write-Host 'localtunnel failed, trying cloudflared...' -ForegroundColor Yellow
  & (Join-Path $PSScriptRoot 'start-tunnel.ps1')
}

$urlFile = Join-Path $Root '.tunnel-url'
if (Test-Path $urlFile) {
  $url = (Get-Content $urlFile -Raw).Trim()
  Write-Host ''
  Write-Host 'Paste into B24 local app (handler + install):' -ForegroundColor Green
  Write-Host $url -ForegroundColor Cyan
  Write-Host ''
  Write-Host 'Stable local URL — set once in B24 (see local-dev.json)' -ForegroundColor Green
  Write-Host 'Later: npm run publish:vercel for no-PC hosting' -ForegroundColor Yellow
}

Write-Host ''
Write-Host '=== Tunnel watchdog ===' -ForegroundColor Cyan
$WatchdogPidFile = Join-Path $Root '.watchdog.pid'
if (Test-Path $WatchdogPidFile) {
  $wPid = (Get-Content $WatchdogPidFile -Raw).Trim()
  if ($wPid -and (Get-Process -Id $wPid -ErrorAction SilentlyContinue)) {
    Write-Host "Watchdog already running PID $wPid" -ForegroundColor Yellow
  } else {
    Remove-Item $WatchdogPidFile -Force -ErrorAction SilentlyContinue
  }
}
if (-not (Test-Path $WatchdogPidFile)) {
  $wd = Start-Process -FilePath 'powershell' `
    -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'tunnel-watchdog.ps1')) `
    -WindowStyle Hidden -PassThru
  $wd.Id | Out-File -FilePath $WatchdogPidFile -Encoding ascii -NoNewline
  Write-Host "Watchdog ON  PID $($wd.Id)  (auto-restart tunnel)" -ForegroundColor Green
}
