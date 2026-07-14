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

$css = [System.IO.File]::ReadAllText($cssPath)
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
Write-Host "has TEXT_FALLBACK: $($check.Contains('TEXT_FALLBACK'))"
Write-Host "has setProperty: $($check.Contains('setProperty'))"

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

Write-Host 'Restart Cursor completely (quit all windows).'
