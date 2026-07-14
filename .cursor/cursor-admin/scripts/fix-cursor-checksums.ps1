# Fix Cursor "installation appears to be corrupt" after Custom CSS patch.
# Updates SHA256 checksum of workbench.html inside product.json.
$ErrorActionPreference = 'Stop'

$htmlCandidates = @(
  (Join-Path $env:LOCALAPPDATA 'Programs\cursor\resources\app\out\vs\code\electron-sandbox\workbench\workbench.html'),
  (Join-Path $env:LOCALAPPDATA 'cursor\resources\app\out\vs\code\electron-sandbox\workbench\workbench.html')
)
$htmlPath = $htmlCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $htmlPath) { throw 'workbench.html not found' }

$appRoot = $htmlPath
foreach ($i in 1..6) { $appRoot = Split-Path $appRoot -Parent }
$productPath = Join-Path $appRoot 'product.json'
if (-not (Test-Path -LiteralPath $productPath)) { throw "product.json not found: $productPath" }

$checksumKey = 'vs/code/electron-sandbox/workbench/workbench.html'
$fileBytes = [System.IO.File]::ReadAllBytes($htmlPath)
$sha = [System.Security.Cryptography.SHA256]::Create().ComputeHash($fileBytes)
$b64 = [Convert]::ToBase64String($sha).TrimEnd('=')

$productRaw = [System.IO.File]::ReadAllText($productPath)
$j = $productRaw | ConvertFrom-Json
$old = $j.checksums.$checksumKey
Write-Host "html: $htmlPath"
Write-Host "old: $old"
Write-Host "new: $b64"

if ($old -eq $b64) {
  Write-Host 'OK checksum already matches — no corrupt warning expected'
  exit 0
}

$pattern = [regex]::Escape('"' + $checksumKey + '"') + '\s*:\s*"[^"]*"'
$replacement = '"' + $checksumKey + '": "' + $b64 + '"'
$productUpdated = [regex]::Replace($productRaw, $pattern, $replacement, 1)
if ($productUpdated -eq $productRaw) { throw 'checksum key replace failed' }

$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($productPath, $productUpdated, $utf8)
Write-Host 'OK product.json checksum updated'
Write-Host 'Restart Cursor completely (quit all windows).'
