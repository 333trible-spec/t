# cloudflared HTTPS tunnel for deal-card-bg
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$TunnelPidFile = Join-Path $Root '.tunnel.pid'
$TunnelLog = Join-Path $Root 'tunnel.log'
$TunnelUrlFile = Join-Path $Root '.tunnel-url'
$Port = if ($env:DEAL_CARD_BG_PORT) { [int]$env:DEAL_CARD_BG_PORT } else { 3848 }

$env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
  [System.Environment]::GetEnvironmentVariable('Path', 'User')

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  Write-Host 'ERROR: cloudflared not found' -ForegroundColor Red
  exit 1
}

try {
  Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 3 | Out-Null
} catch {
  Write-Host 'Start app first: npm run app:start' -ForegroundColor Red
  exit 1
}

if (Test-Path $TunnelPidFile) {
  $tPid = (Get-Content $TunnelPidFile -Raw).Trim()
  if ($tPid) { Stop-Process -Id $tPid -Force -ErrorAction SilentlyContinue }
  Remove-Item $TunnelPidFile -Force -ErrorAction SilentlyContinue
}
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Remove-Item $TunnelLog -Force -ErrorAction SilentlyContinue
New-Item -ItemType File -Path $TunnelLog -Force | Out-Null

$proc = Start-Process -FilePath 'cloudflared' `
  -ArgumentList @('tunnel', '--protocol', 'http2', '--url', "http://127.0.0.1:$Port") `
  -RedirectStandardError $TunnelLog `
  -WindowStyle Hidden -PassThru

$proc.Id | Out-File -FilePath $TunnelPidFile -Encoding ascii -NoNewline

$url = $null
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Seconds 1
  if (-not (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue)) { break }
  if (Test-Path $TunnelLog) {
    $text = Get-Content $TunnelLog -Raw -ErrorAction SilentlyContinue
    if ($text -and $text -match '(https://[a-z0-9-]+\.trycloudflare\.com)') {
      $url = $Matches[1]
      break
    }
  }
}

if ($url) {
  $installUrl = "$url/install.html"
  $installUrl | Out-File -FilePath $TunnelUrlFile -Encoding utf8 -NoNewline
  Write-Host ''
  Write-Host 'HTTPS install URL (paste into B24 local app):' -ForegroundColor Green
  Write-Host $installUrl -ForegroundColor Cyan
  Write-Host ''
  Write-Host "Tunnel PID $($proc.Id)" -ForegroundColor Yellow

  $ok = $false
  for ($i = 0; $i -lt 8; $i++) {
    Start-Sleep -Seconds 2
    try {
      $check = Invoke-WebRequest -Uri "$url/health" -UseBasicParsing -TimeoutSec 20
      if ($check.Content -like '*"ok":true*') {
        $ok = $true
        break
      }
    } catch {
      # retry
    }
  }
  if ($ok) {
    Write-Host 'Health check: OK' -ForegroundColor Green
  } else {
    Write-Host 'Health check: FAILED (530/1033). Use: npm run tunnel (localtunnel) or disable VPN.' -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host 'URL not found. Last lines of tunnel.log:' -ForegroundColor Yellow
  if (Test-Path $TunnelLog) { Get-Content $TunnelLog -Tail 8 }
  Write-Host "Tunnel PID $($proc.Id)"
}
