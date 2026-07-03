$Root = Split-Path -Parent $PSScriptRoot
$PidFile = Join-Path $Root '.app.pid'
$TunnelPidFile = Join-Path $Root '.tunnel.pid'
$TunnelUrlFile = Join-Path $Root '.tunnel-url'
$Port = if ($env:DEAL_CARD_BG_PORT) { [int]$env:DEAL_CARD_BG_PORT } else { 3848 }

if (Test-Path $PidFile) {
  $appPid = (Get-Content $PidFile -Raw).Trim()
  if ($appPid -and (Get-Process -Id $appPid -ErrorAction SilentlyContinue)) {
    try {
      $h = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 3
      Write-Host "App ON  PID $appPid  port $Port" -ForegroundColor Green
    } catch {
      Write-Host "App PID $appPid (health fail)" -ForegroundColor Yellow
    }
  } else {
    Write-Host 'App OFF (stale pid file)' -ForegroundColor Gray
  }
} else {
  Write-Host 'App OFF' -ForegroundColor Gray
}

if (Test-Path $TunnelPidFile) {
  $tPid = (Get-Content $TunnelPidFile -Raw).Trim()
  if ($tPid -and (Get-Process -Id $tPid -ErrorAction SilentlyContinue)) {
    Write-Host "Tunnel ON  PID $tPid" -ForegroundColor Green
    if (Test-Path $TunnelUrlFile) {
      Write-Host "URL: $((Get-Content $TunnelUrlFile -Raw).Trim())" -ForegroundColor Cyan
    }
  } else {
    Write-Host 'Tunnel OFF' -ForegroundColor Gray
  }
} else {
  Write-Host 'Tunnel OFF' -ForegroundColor Gray
}
