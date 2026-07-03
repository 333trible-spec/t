# Полная остановка CRM-бота
$ErrorActionPreference = 'SilentlyContinue'
$Root = Split-Path -Parent $PSScriptRoot
$PidFile = Join-Path $Root '.bot.pid'
$stopped = $false

if (Test-Path $PidFile) {
  $botPid = (Get-Content $PidFile -Raw).Trim()
  if ($botPid -and (Get-Process -Id $botPid -ErrorAction SilentlyContinue)) {
    Stop-Process -Id $botPid -Force
    $stopped = $true
    Write-Host "Stopped bot PID $botPid" -ForegroundColor Green
  }
  Remove-Item $PidFile -Force
}

foreach ($conn in Get-NetTCPConnection -LocalPort 3847 -ErrorAction SilentlyContinue) {
  $procId = $conn.OwningProcess
  if ($procId -and (Get-Process -Id $procId -ErrorAction SilentlyContinue)) {
    $name = (Get-Process -Id $procId).ProcessName
    if ($name -eq 'node') {
      Stop-Process -Id $procId -Force
      $stopped = $true
      Write-Host "Stopped node on port 3847 (PID $procId)" -ForegroundColor Green
    }
  }
}

if (-not $stopped) {
  Write-Host 'Bot already OFF.' -ForegroundColor Cyan
} else {
  Write-Host 'No CPU/RAM used. Start again: .\scripts\start-bot.ps1' -ForegroundColor Gray
}
