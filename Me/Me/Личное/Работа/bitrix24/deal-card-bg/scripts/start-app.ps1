# Start deal-card-bg local app
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$AppDir = Join-Path $Root 'app'
$PidFile = Join-Path $Root '.app.pid'
$LogFile = Join-Path $Root 'app.log'
$Port = if ($env:DEAL_CARD_BG_PORT) { [int]$env:DEAL_CARD_BG_PORT } else { 3848 }

$env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
  [System.Environment]::GetEnvironmentVariable('Path', 'User')

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'ERROR: Node.js not found' -ForegroundColor Red
  exit 1
}

& node (Join-Path $Root 'scripts/sync-public-assets.js')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (Test-Path $PidFile) {
  $appPid = (Get-Content $PidFile -Raw).Trim()
  if ($appPid -and (Get-Process -Id $appPid -ErrorAction SilentlyContinue)) {
    Write-Host "Already running PID $appPid. Run: npm run app:stop" -ForegroundColor Yellow
    exit 0
  }
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

$conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
  Write-Host "Port $Port busy PID $($conn.OwningProcess)" -ForegroundColor Yellow
  exit 1
}

$env:DEAL_CARD_BG_PORT = "$Port"
$proc = Start-Process -FilePath 'node' -ArgumentList 'server.js' `
  -WorkingDirectory $AppDir -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput $LogFile -RedirectStandardError (Join-Path $Root 'app.err.log')

$proc.Id | Out-File -FilePath $PidFile -Encoding ascii -NoNewline
Start-Sleep -Seconds 2

$health = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
if ($health -and $health.Content -like '*ok*true*') {
  Write-Host "App ON  PID $($proc.Id)  http://127.0.0.1:$Port" -ForegroundColor Green
  Write-Host 'Next: npm run tunnel' -ForegroundColor Cyan
} else {
  Write-Host "Started PID $($proc.Id) but health check failed. See app.err.log" -ForegroundColor Yellow
}
