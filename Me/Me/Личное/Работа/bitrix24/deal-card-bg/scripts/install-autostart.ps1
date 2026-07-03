# Автозапуск deal-card-bg при входе в Windows (стабильный локальный режим)
# Запустить один раз от имени пользователя:
#   powershell -ExecutionPolicy Bypass -File scripts/install-autostart.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$TaskName = 'B24-DealCardBg-Local'
$StartScript = Join-Path $PSScriptRoot 'start-all.ps1'

$action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$StartScript`"" `
  -WorkingDirectory $Root

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 2)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description 'Локальный сервер + туннель deal-card-bg для Битрикс24' `
  -Force | Out-Null

Write-Host "Задача '$TaskName' создана." -ForegroundColor Green
Write-Host "При входе в Windows: npm run start (фиксированный URL из local-dev.json)"
Write-Host ""
Write-Host "Удалить: Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
