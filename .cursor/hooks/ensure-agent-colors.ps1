# sessionStart / guard: restore agent chat color injection if Cursor wiped it.
# Fail open — never block chat. ASCII-only (Windows PowerShell 5.1 + no BOM).
$ErrorActionPreference = 'Stop'

function Write-AgentColorsLog {
    param([string]$Message)
    try {
        $logDir = Join-Path $env:APPDATA 'Cursor\User\logs'
        New-Item -ItemType Directory -Force -Path $logDir | Out-Null
        $line = ('{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message)
        Add-Content -LiteralPath (Join-Path $logDir 'agent-colors-hook.log') -Value $line -Encoding UTF8
    } catch {}
}

function Get-WorkbenchHtmlPath {
    $htmlCandidates = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\cursor\resources\app\out\vs\code\electron-sandbox\workbench\workbench.html'),
        (Join-Path $env:LOCALAPPDATA 'cursor\resources\app\out\vs\code\electron-sandbox\workbench\workbench.html')
    )
    return ,@($htmlCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1)
}

function Test-AgentChatColorsInjected {
    param([string]$HtmlPath)
    if (-not $HtmlPath -or -not (Test-Path -LiteralPath $HtmlPath)) { return $false }
    try {
        $html = [System.IO.File]::ReadAllText($HtmlPath)
    } catch {
        return $false
    }
    return $html.Contains('VSCODE-CUSTOM-CSS-START') -and
           $html.Contains('7c3aed') -and
           $html.Contains('setProperty')
}

function Get-ReapplyScriptPath {
    # Prefer ASCII AppData copy (vault path may contain non-ASCII).
    $fromAppData = Join-Path $env:APPDATA 'Cursor\User\reapply-agent-chat-colors.ps1'
    if (Test-Path -LiteralPath $fromAppData) { return $fromAppData }
    $fromProject = Join-Path (Split-Path $PSScriptRoot -Parent) 'cursor-admin\scripts\reapply-agent-chat-colors.ps1'
    if (Test-Path -LiteralPath $fromProject) { return $fromProject }
    $fromHooksParent = Join-Path (Split-Path $PSScriptRoot -Parent) 'cursor-admin\scripts\reapply-agent-chat-colors.ps1'
    if (Test-Path -LiteralPath $fromHooksParent) { return $fromHooksParent }
    return $null
}

function Show-AgentColorsToast {
    param([string]$Text)
    try {
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
        [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime] | Out-Null
        $safe = [System.Security.SecurityElement]::Escape($Text)
        $xml = @"
<toast>
  <visual>
    <binding template="ToastGeneric">
      <text>Cursor agent colors</text>
      <text>$safe</text>
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
}

$source = 'unknown'
if ($env:CURSOR_HOOK_EVENT) { $source = $env:CURSOR_HOOK_EVENT }
elseif ($args.Count -gt 0 -and $args[0]) { $source = [string]$args[0] }
Write-AgentColorsLog ("START source={0} pid={1}" -f $source, $PID)

try {
    $htmlPath = Get-WorkbenchHtmlPath
    if (-not $htmlPath) {
        Write-AgentColorsLog 'SKIP workbench.html not found'
        exit 0
    }

    if (Test-AgentChatColorsInjected $htmlPath) {
        Write-AgentColorsLog ("OK already injected: {0}" -f $htmlPath)
        exit 0
    }

    Write-AgentColorsLog ("MISSING injection in {0}" -f $htmlPath)

    $reapply = Get-ReapplyScriptPath
    if (-not $reapply) {
        Write-AgentColorsLog 'FAIL reapply script not found'
        exit 0
    }

    Write-AgentColorsLog ("RUN {0}" -f $reapply)
    $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $reapply 2>&1
    foreach ($line in @($output)) {
        if ($line) { Write-AgentColorsLog ("  {0}" -f $line) }
    }

    if (Test-AgentChatColorsInjected $htmlPath) {
        Write-AgentColorsLog 'REPAIRED ok'
        $cursorRunning = [bool](Get-Process -Name 'Cursor' -ErrorAction SilentlyContinue)
        if ($cursorRunning) {
            Show-AgentColorsToast 'Colors restored in files. Fully quit Cursor (all windows) and open again.'
        }
    } else {
        Write-AgentColorsLog 'REPAIR failed - injection still missing'
        Show-AgentColorsToast 'Could not restore colors. Quit Cursor, then run start-cursor.ps1 or reapply-agent-chat-colors.ps1.'
    }
} catch {
    Write-AgentColorsLog ("ERROR {0}" -f $_.Exception.Message)
}

exit 0
