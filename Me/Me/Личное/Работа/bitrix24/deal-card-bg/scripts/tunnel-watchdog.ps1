# Auto-restart localtunnel when health check fails (deal-card-bg)
$ErrorActionPreference = 'SilentlyContinue'
$Root = Split-Path -Parent $PSScriptRoot
$UrlFile = Join-Path $Root '.tunnel-url'
$TunnelScript = Join-Path $PSScriptRoot 'start-tunnel-localtunnel.ps1'
$LogFile = Join-Path $Root 'watchdog.log'
$IntervalSec = 40
$configPath = Join-Path $Root 'local-dev.json'
if (Test-Path $configPath) {
  try {
    $cfg = Get-Content $configPath -Raw | ConvertFrom-Json
    if ($cfg.watchdogIntervalSec) { $IntervalSec = [int]$cfg.watchdogIntervalSec }
  } catch { }
}

function Write-Log([string]$msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
  Add-Content -Path $LogFile -Value $line -Encoding utf8
}

function Test-TunnelHealth([string]$baseUrl) {
  if (-not $baseUrl) { return $false }
  try {
    $health = $baseUrl -replace '/install\.html$', '/health'
    $r = Invoke-WebRequest -Uri $health -UseBasicParsing -TimeoutSec 20 `
      -Headers @{ 'Bypass-Tunnel-Reminder' = '1' }
    return ($r.StatusCode -eq 200 -and $r.Content -like '*"ok":true*')
  } catch {
    return $false
  }
}

Write-Log 'watchdog started'
Write-Host 'Tunnel watchdog ON (check every' $IntervalSec 's)' -ForegroundColor Cyan

while ($true) {
  Start-Sleep -Seconds $IntervalSec

  $appPidFile = Join-Path $Root '.app.pid'
  if (-not (Test-Path $appPidFile)) {
    Write-Log 'app off — skip'
    continue
  }

  $tunnelUrl = $null
  if (Test-Path $UrlFile) {
    $tunnelUrl = (Get-Content $UrlFile -Raw).Trim()
  }

  if (Test-TunnelHealth $tunnelUrl) {
    continue
  }

  Write-Log "tunnel dead, restarting (was: $tunnelUrl)"
  Write-Host "[watchdog] Tunnel down — restarting…" -ForegroundColor Yellow

  $tunnelPidFile = Join-Path $Root '.tunnel.pid'
  if (Test-Path $tunnelPidFile) {
    $tPid = (Get-Content $tunnelPidFile -Raw).Trim()
    if ($tPid) { Stop-Process -Id $tPid -Force -ErrorAction SilentlyContinue }
    Remove-Item $tunnelPidFile -Force -ErrorAction SilentlyContinue
  }
  Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

  $log = Join-Path $Root 'tunnel.log'
  if (Test-Path $log) {
    try { Remove-Item $log -Force } catch { }
  }

  & $TunnelScript 2>&1 | ForEach-Object { Write-Log $_ }

  if (Test-Path $UrlFile) {
    $newUrl = (Get-Content $UrlFile -Raw).Trim()
    Write-Log "tunnel up: $newUrl"
    Write-Host "[watchdog] New URL: $newUrl" -ForegroundColor Green
    Write-Host "[watchdog] Update B24 app handler+install if URL changed!" -ForegroundColor Yellow
  } else {
    Write-Log 'tunnel restart failed'
    Write-Host '[watchdog] Restart failed — see watchdog.log' -ForegroundColor Red
  }
}
