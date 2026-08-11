# Optional manual launcher: patch workbench.html then start Cursor.exe.
# DO NOT wire Desktop/Start Menu shortcuts to this script (user ban 2026-07-28).
$ErrorActionPreference = 'Stop'

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
    $html = [System.IO.File]::ReadAllText($HtmlPath)
    return $html.Contains('VSCODE-CUSTOM-CSS-START') -and
           $html.Contains('7c3aed') -and
           $html.Contains('setProperty')
}

function Get-CursorExePath {
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\cursor\Cursor.exe'),
        (Join-Path ${env:ProgramFiles} 'Cursor\Cursor.exe')
    )
    return ,@($candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1)
}

function Get-ReapplyPath {
    $local = Join-Path $PSScriptRoot 'reapply-agent-chat-colors.ps1'
    if (Test-Path -LiteralPath $local) { return $local }
    $app = Join-Path $env:APPDATA 'Cursor\User\reapply-agent-chat-colors.ps1'
    if (Test-Path -LiteralPath $app) { return $app }
    return $null
}

$cursor = Get-CursorExePath
if (-not $cursor) { throw 'Cursor.exe not found' }

$htmlPath = Get-WorkbenchHtmlPath
$reapply = Get-ReapplyPath
$needsPatch = $htmlPath -and -not (Test-AgentChatColorsInjected $htmlPath)

if ($needsPatch -and $reapply) {
    Write-Host 'Patching agent chat colors before launch...'
    & powershell -NoProfile -ExecutionPolicy Bypass -File $reapply | Out-Host
    $needsPatch = -not (Test-AgentChatColorsInjected $htmlPath)
}

$running = Get-Process -Name 'Cursor' -ErrorAction SilentlyContinue
if ($running -and $needsPatch) {
    Write-Host 'WARNING: injection still missing while Cursor is running. Quit all windows, then launch again via this script.'
}

if ($running -and -not $needsPatch) {
    Write-Host 'Cursor already running (injection OK). Opening another window...'
    Start-Process -LiteralPath $cursor
    exit 0
}

if ($running) {
    Start-Process -LiteralPath $cursor
    exit 0
}

Write-Host "Starting: $cursor"
Start-Process -LiteralPath $cursor @args
