# Stop deal-card-bg app and tunnel
$ErrorActionPreference = 'SilentlyContinue'
$Root = Split-Path -Parent $PSScriptRoot
$PidFile = Join-Path $Root '.app.pid'
$Port = if ($env:DEAL_CARD_BG_PORT) { [int]$env:DEAL_CARD_BG_PORT } else { 3848 }

if (Test-Path $PidFile) {
  $appPid = (Get-Content $PidFile -Raw).Trim()
  if ($appPid) {
    Stop-Process -Id $appPid -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped app PID $appPid" -ForegroundColor Green
  }
  Remove-Item $PidFile -Force
}

foreach ($conn in Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue) {
  $procId = $conn.OwningProcess
  if ($procId -and $procId -ne 0) {
    $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($p -and $p.ProcessName -eq 'node') {
      Stop-Process -Id $procId -Force
      Write-Host "Stopped node on port $Port PID $procId" -ForegroundColor Green
    }
  }
}

$TunnelPidFile = Join-Path $Root '.tunnel.pid'
if (Test-Path $TunnelPidFile) {
  $tPid = (Get-Content $TunnelPidFile -Raw).Trim()
  if ($tPid) { Stop-Process -Id $tPid -Force -ErrorAction SilentlyContinue }
  Remove-Item $TunnelPidFile -Force
  Write-Host 'Stopped tunnel process' -ForegroundColor Green
}

Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

$WatchdogPidFile = Join-Path $Root '.watchdog.pid'
if (Test-Path $WatchdogPidFile) {
  $wPid = (Get-Content $WatchdogPidFile -Raw).Trim()
  if ($wPid) { Stop-Process -Id $wPid -Force -ErrorAction SilentlyContinue }
  Remove-Item $WatchdogPidFile -Force
  Write-Host 'Stopped watchdog' -ForegroundColor Green
}

Write-Host 'OFF' -ForegroundColor Gray
