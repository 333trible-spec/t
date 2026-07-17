# sessionStart hook: если обновление Cursor снесло инъекцию цветов агентов —
# восстановить через reapply-agent-chat-colors.ps1 и показать toast-уведомление.
# Всегда fail open (exit 0), чтобы не мешать работе чата.
$ErrorActionPreference = 'SilentlyContinue'

try {
  $htmlCandidates = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\cursor\resources\app\out\vs\code\electron-sandbox\workbench\workbench.html'),
    (Join-Path $env:LOCALAPPDATA 'cursor\resources\app\out\vs\code\electron-sandbox\workbench\workbench.html')
  )
  $htmlPath = $htmlCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if (-not $htmlPath) { exit 0 }

  $html = [System.IO.File]::ReadAllText($htmlPath)
  if ($html.Contains('VSCODE-CUSTOM-CSS-START')) { exit 0 }

  $reapply = Join-Path (Split-Path $PSScriptRoot -Parent) 'cursor-admin\scripts\reapply-agent-chat-colors.ps1'
  if (-not (Test-Path -LiteralPath $reapply)) { exit 0 }

  & powershell -NoProfile -ExecutionPolicy Bypass -File $reapply | Out-Null

  # Toast: цвета восстановлены, нужен полный перезапуск Cursor
  try {
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime] | Out-Null
    $xml = @"
<toast>
  <visual>
    <binding template="ToastGeneric">
      <text>Cursor обновился</text>
      <text>Цвета агентов восстановлены. Полностью перезапустите Cursor, чтобы они вернулись.</text>
    </binding>
  </visual>
</toast>
"@
    $doc = New-Object Windows.Data.Xml.Dom.XmlDocument
    $doc.LoadXml($xml)
    $appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show(
      (New-Object Windows.UI.Notifications.ToastNotification $doc)
    )
  } catch {}
} catch {}

exit 0
