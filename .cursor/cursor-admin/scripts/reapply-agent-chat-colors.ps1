# Re-apply agent-chat-colors into Cursor workbench.html (same as Enable Custom CSS).
$ErrorActionPreference = 'Stop'

$adminRoot = Split-Path $PSScriptRoot -Parent
$vaultCss = Join-Path $adminRoot 'agent-chat-colors.css'
$vaultJs = Join-Path $adminRoot 'agent-chat-colors.js'

$userDir = Join-Path $env:APPDATA 'Cursor\User'
$cssPath = Join-Path $userDir 'agent-chat-colors.css'
$jsPath = Join-Path $userDir 'agent-chat-colors.js'
$extStatus = Join-Path $env:USERPROFILE '.cursor\extensions\be5invis.vscode-custom-css-7.5.0\src\statusbar.js'

$htmlCandidates = @(
  (Join-Path $env:LOCALAPPDATA 'Programs\cursor\resources\app\out\vs\code\electron-sandbox\workbench\workbench.html'),
  (Join-Path $env:LOCALAPPDATA 'cursor\resources\app\out\vs\code\electron-sandbox\workbench\workbench.html')
)
$htmlPath = $htmlCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $htmlPath) { throw 'workbench.html not found' }

if (Test-Path -LiteralPath $vaultCss) { Copy-Item -LiteralPath $vaultCss -Destination $cssPath -Force }
if (Test-Path -LiteralPath $vaultJs) { Copy-Item -LiteralPath $vaultJs -Destination $jsPath -Force }
if (-not (Test-Path -LiteralPath $cssPath)) { throw "CSS missing: $cssPath" }
if (-not (Test-Path -LiteralPath $jsPath)) { throw "JS missing: $jsPath" }

# Local Amiri fonts for Sheikh (no Google Fonts / CSP)
$fontsSrc = Join-Path $adminRoot 'fonts'
$fontsDst = Join-Path $userDir 'fonts'
if (Test-Path -LiteralPath $fontsSrc) {
  New-Item -ItemType Directory -Force -Path $fontsDst | Out-Null
  Copy-Item -Path (Join-Path $fontsSrc '*') -Destination $fontsDst -Force
}
$fontsFileUrl = ('file:///' + ($fontsDst -replace '\\', '/'))

$css = [System.IO.File]::ReadAllText($cssPath)
$css = $css.Replace('AGENT_FONTS_DIR', $fontsFileUrl)
[System.IO.File]::WriteAllText($cssPath, $css, (New-Object System.Text.UTF8Encoding $false))
$js = [System.IO.File]::ReadAllText($jsPath)
$indicator = ''
if (Test-Path -LiteralPath $extStatus) {
  $indicator = '<script>' + [System.IO.File]::ReadAllText($extStatus) + '</script>'
}

$uuid = [guid]::NewGuid().ToString()
$html = [System.IO.File]::ReadAllText($htmlPath)

$html = [regex]::Replace($html, '<!-- !! VSCODE-CUSTOM-CSS-START !! -->[\s\S]*?<!-- !! VSCODE-CUSTOM-CSS-END !! -->\r?\n*', '')
$html = [regex]::Replace($html, '<!-- !! VSCODE-CUSTOM-CSS-SESSION-ID [\w-]+ !! -->\r?\n*', '')
$html = [regex]::Replace($html, '<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?/>', '')

$inject = @(
  "<!-- !! VSCODE-CUSTOM-CSS-SESSION-ID $uuid !! -->",
  '<!-- !! VSCODE-CUSTOM-CSS-START !! -->',
  $indicator,
  ('<style>' + $css + '</style>'),
  ('<script>' + $js + '</script>'),
  '<!-- !! VSCODE-CUSTOM-CSS-END !! -->',
  '</html>'
) -join "`n"

if ($html -notmatch '</html>\s*$') { throw 'workbench.html: unexpected end (no </html>)' }
$html = [regex]::Replace($html, '</html>\s*$', [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $inject })

try {
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($htmlPath, $html, $utf8)
} catch {
  throw "Cannot write workbench.html (close Cursor or run as admin): $($_.Exception.Message)"
}

$check = [System.IO.File]::ReadAllText($htmlPath)
Write-Host "OK patched: $htmlPath"
Write-Host "session: $uuid"
Write-Host "has 7c3aed: $($check.Contains('7c3aed'))"
Write-Host "has sheikh/f59e0b: $($check.Contains('f59e0b') -or $check.Contains('sheikh'))"
Write-Host "has setProperty: $($check.Contains('setProperty'))"
Write-Host "has SheikhAmiri: $($check.Contains('SheikhAmiri'))"

# Обновить checksum в product.json — иначе при запуске «installation appears to be corrupt»
$appRoot = Split-Path (Split-Path (Split-Path (Split-Path $htmlPath -Parent) -Parent) -Parent) -Parent
# html: .../app/out/vs/code/electron-sandbox/workbench/workbench.html
# up: workbench -> electron-sandbox -> code -> vs -> out -> app
$appRoot = $htmlPath
foreach ($i in 1..6) { $appRoot = Split-Path $appRoot -Parent }
$productPath = Join-Path $appRoot 'product.json'
$checksumKey = 'vs/code/electron-sandbox/workbench/workbench.html'
if (Test-Path -LiteralPath $productPath) {
  $fileBytes = [System.IO.File]::ReadAllBytes($htmlPath)
  $sha = [System.Security.Cryptography.SHA256]::Create().ComputeHash($fileBytes)
  $b64 = [Convert]::ToBase64String($sha).TrimEnd('=')
  $productRaw = [System.IO.File]::ReadAllText($productPath)
  $pattern = [regex]::Escape('"' + $checksumKey + '"') + '\s*:\s*"[^"]*"'
  $replacement = '"' + $checksumKey + '": "' + $b64 + '"'
  $productUpdated = [regex]::Replace($productRaw, $pattern, $replacement, 1)
  if ($productUpdated -eq $productRaw) {
    Write-Host "WARN: checksum key not found in product.json"
  } else {
    $utf8p = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($productPath, $productUpdated, $utf8p)
    Write-Host "OK checksum updated: $b64"
  }
} else {
  Write-Host "WARN: product.json not found: $productPath"
}

# Copies for user-hook / guard (ASCII AppData path; UTF-8 BOM for Windows PowerShell 5.1).
function Copy-Ps1Utf8Bom {
  param([string]$Source, [string]$Destination)
  if (-not (Test-Path -LiteralPath $Source)) { return }
  $text = [System.IO.File]::ReadAllText($Source)
  $utf8Bom = New-Object System.Text.UTF8Encoding $true
  [System.IO.File]::WriteAllText($Destination, $text, $utf8Bom)
}

$userDir = Join-Path $env:APPDATA 'Cursor\User'
$userHookDir = Join-Path $env:USERPROFILE '.cursor\hooks'
$guardDir = Join-Path $userDir 'agent-colors-guard'
New-Item -ItemType Directory -Force -Path $userDir, $userHookDir, $guardDir | Out-Null
Copy-Ps1Utf8Bom -Source $PSCommandPath -Destination (Join-Path $userDir 'reapply-agent-chat-colors.ps1')
Copy-Ps1Utf8Bom -Source $PSCommandPath -Destination (Join-Path $guardDir 'reapply-agent-chat-colors.ps1')

$ensureSrc = Join-Path (Split-Path $PSScriptRoot -Parent) '..\hooks\ensure-agent-colors.ps1'
if (Test-Path -LiteralPath $ensureSrc) {
  Copy-Ps1Utf8Bom -Source $ensureSrc -Destination (Join-Path $userDir 'ensure-agent-colors.ps1')
  Copy-Ps1Utf8Bom -Source $ensureSrc -Destination (Join-Path $userHookDir 'ensure-agent-colors.ps1')
  Copy-Ps1Utf8Bom -Source $ensureSrc -Destination (Join-Path $guardDir 'ensure-agent-colors.ps1')
}
$ensureCmdSrc = Join-Path (Split-Path $PSScriptRoot -Parent) '..\hooks\ensure-agent-colors.cmd'
if (Test-Path -LiteralPath $ensureCmdSrc) {
  Copy-Item -LiteralPath $ensureCmdSrc -Destination (Join-Path $userHookDir 'ensure-agent-colors.cmd') -Force
}
$startSrc = Join-Path $PSScriptRoot 'start-cursor.ps1'
if (Test-Path -LiteralPath $startSrc) {
  Copy-Ps1Utf8Bom -Source $startSrc -Destination (Join-Path $guardDir 'start-cursor.ps1')
}

$userHooksPath = Join-Path $env:USERPROFILE '.cursor\hooks.json'
if (Test-Path -LiteralPath $userHooksPath) {
  $hooksRaw = [System.IO.File]::ReadAllText($userHooksPath)
  if ($hooksRaw -notmatch 'ensure-agent-colors') {
    $hooks = [ordered]@{ version = 1; hooks = [ordered]@{} }
    if ($hooksRaw -match '^\s*\{') {
      $parsed = $hooksRaw | ConvertFrom-Json
      if ($parsed.version) { $hooks.version = [int]$parsed.version }
      if ($parsed.hooks) {
        foreach ($prop in $parsed.hooks.PSObject.Properties) {
          $hooks.hooks[$prop.Name] = @($prop.Value)
        }
      }
    }
    $entry = [ordered]@{
      command = './hooks/ensure-agent-colors.cmd'
      timeout = 30
    }
    $existing = @()
    if ($hooks.hooks.Contains('sessionStart')) {
      $existing = @($hooks.hooks.sessionStart)
    }
    $hooks.hooks.sessionStart = @($entry) + $existing
    $hooksOut = ($hooks | ConvertTo-Json -Depth 8)
    [System.IO.File]::WriteAllText($userHooksPath, $hooksOut, (New-Object System.Text.UTF8Encoding $false))
    Write-Host 'OK user hooks.json updated'
  }
}

Write-Host 'Restart Cursor completely (quit all windows).'
Write-Host 'NEVER rewrite Desktop/Start Menu shortcuts. Colors only touch workbench.html.'
