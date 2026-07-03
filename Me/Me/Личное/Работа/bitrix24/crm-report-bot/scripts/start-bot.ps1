# Start CRM report bot (background node process)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$PidFile = Join-Path $Root '.bot.pid'
$LogFile = Join-Path $Root 'server.log'

$env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
  [System.Environment]::GetEnvironmentVariable('Path', 'User')

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'ERROR: Node.js not found' -ForegroundColor Red
  exit 1
}

if (Test-Path $PidFile) {
  $botPid = (Get-Content $PidFile -Raw).Trim()
  if ($botPid -and (Get-Process -Id $botPid -ErrorAction SilentlyContinue)) {
    Write-Host "Already running PID $botPid. Run stop-bot.ps1 first." -ForegroundColor Yellow
    exit 0
  }
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

$conn = Get-NetTCPConnection -LocalPort 3847 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
  Write-Host "Port 3847 busy PID $($conn.OwningProcess). Run stop-bot.ps1" -ForegroundColor Yellow
  exit 1
}

$proc = Start-Process -FilePath 'node' -ArgumentList 'server.js' `
  -WorkingDirectory $Root -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput $LogFile -RedirectStandardError (Join-Path $Root 'server.err.log')

$proc.Id | Out-File -FilePath $PidFile -Encoding ascii -NoNewline
Start-Sleep -Seconds 2

$health = Invoke-WebRequest -Uri 'http://127.0.0.1:3847/health' -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
if ($health -and $health.Content -like '*ok*true*') {
  Write-Host "Bot ON PID $($proc.Id). Log: $LogFile" -ForegroundColor Green
} else {
  Write-Host "Started PID $($proc.Id) but health check failed. See server.err.log" -ForegroundColor Yellow
}
