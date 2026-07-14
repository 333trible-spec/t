# Install agent-chat-colors.css + .js into Cursor (ASCII path + vscode_custom_css.imports)
# Кириллица в file:// к vault часто ломает Custom CSS Loader — копируем в %APPDATA%.
$ErrorActionPreference = 'Stop'

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$cssSrc = Join-Path $root 'cursor-admin\agent-chat-colors.css'
$jsSrc = Join-Path $root 'cursor-admin\agent-chat-colors.js'
if (-not (Test-Path -LiteralPath $cssSrc)) {
  throw "CSS not found: $cssSrc"
}
if (-not (Test-Path -LiteralPath $jsSrc)) {
  throw "JS not found: $jsSrc"
}

$userDir = Join-Path $env:APPDATA 'Cursor\User'
if (-not (Test-Path -LiteralPath $userDir)) {
  throw "Cursor User dir not found: $userDir"
}

$cssDst = Join-Path $userDir 'agent-chat-colors.css'
$jsDst = Join-Path $userDir 'agent-chat-colors.js'
Copy-Item -LiteralPath $cssSrc -Destination $cssDst -Force
Copy-Item -LiteralPath $jsSrc -Destination $jsDst -Force

$settingsPath = Join-Path $userDir 'settings.json'
if (-not (Test-Path -LiteralPath $settingsPath)) {
  throw "settings.json not found: $settingsPath"
}

$cssUri = ([Uri]::new($cssDst)).AbsoluteUri
$jsUri = ([Uri]::new($jsDst)).AbsoluteUri

$raw = Get-Content -LiteralPath $settingsPath -Raw -Encoding UTF8
if ($raw -match '^\s*\{') {
  $json = $raw | ConvertFrom-Json
} else {
  $json = [ordered]@{}
}

if (-not $json.PSObject.Properties['vscode_custom_css.imports']) {
  Add-Member -InputObject $json -NotePropertyName 'vscode_custom_css.imports' -Value @()
}

# Keep as Object[]: `$null + 'a' + 'b'` / bare `+=` on empty pipeline glues URIs into one string.
$imports = [System.Collections.Generic.List[string]]::new()
foreach ($item in @($json.'vscode_custom_css.imports')) {
  if (-not $item) { continue }
  if ($item -match 'agent-chat-colors\.(css|js)') { continue }
  $imports.Add([string]$item)
}
$imports.Add($cssUri)
$imports.Add($jsUri)
$json.'vscode_custom_css.imports' = $imports.ToArray()

$out = $json | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText($settingsPath, $out, [System.Text.UTF8Encoding]::new($false))

Write-Host "OK: CSS+JS copied to ASCII path"
Write-Host $cssDst
Write-Host $jsDst
Write-Host $cssUri
Write-Host $jsUri

$reapply = Join-Path $PSScriptRoot 'reapply-agent-chat-colors.ps1'
if (Test-Path -LiteralPath $reapply) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File $reapply
} else {
  Write-Host "Next: Command Palette -> Enable Custom CSS and JS -> Restart Cursor"
}
