# Bot status
$Root = Split-Path -Parent $PSScriptRoot
$PidFile = Join-Path $Root '.bot.pid'

if (Test-Path $PidFile) {
  $botPid = (Get-Content $PidFile -Raw).Trim()
  if ($botPid -and (Get-Process -Id $botPid -ErrorAction SilentlyContinue)) {
    $health = Invoke-WebRequest -Uri 'http://127.0.0.1:3847/health' -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
    if ($health) {
      Write-Host "ON PID $botPid $($health.Content)" -ForegroundColor Green
      exit 0
    }
    Write-Host "PID $botPid running but health failed" -ForegroundColor Yellow
    exit 1
  }
}

$conn = Get-NetTCPConnection -LocalPort 3847 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
  Write-Host "ON port 3847 PID $($conn.OwningProcess)" -ForegroundColor Yellow
  exit 0
}

Write-Host 'OFF - no bot process' -ForegroundColor Cyan
