#Requires -Version 5.1
# Cursor hook: stop — chime Disco Elysium (Гарри)
# PlaySync in-process: breakaway worker was killed with the hook job; timeout is 8s+.
$ErrorActionPreference = 'SilentlyContinue'

function Write-HookOk {
    [Console]::Out.WriteLine('{}')
}

function Write-ChimeLog {
    param([string]$Message)
    try {
        $line = '[{0}] {1}' -f (Get-Date).ToString('o'), $Message
        Add-Content -LiteralPath (Join-Path $env:TEMP 'cursor-garri-chime-last.log') -Value $line -Encoding UTF8
    }
    catch { }
}

# Drain stdin without Peek() — Peek can hang on Windows pipes.
$inputText = ''
try {
    $inputText = [Console]::In.ReadToEnd()
}
catch { }

if ($inputText -and $inputText.Trim().Length -gt 0) {
    try {
        $payload = $inputText | ConvertFrom-Json
        if ($payload.PSObject.Properties.Name -contains 'status' -and $payload.status -and $payload.status -ne 'completed') {
            Write-HookOk
            exit 0
        }
    }
    catch { }
}

$vaultRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$soundDir = Join-Path $vaultRoot '.cursor\sounds'
$baseName = 'disco-elysium-fys-chime'
$extensions = @('.wav', '.mp3', '.ogg', '.m4a', '.flac')

$soundFile = $null
foreach ($ext in $extensions) {
    $candidate = Join-Path $soundDir ($baseName + $ext)
    if (Test-Path -LiteralPath $candidate) {
        $soundFile = (Resolve-Path -LiteralPath $candidate).Path
        break
    }
}

if (-not $soundFile) {
    Write-ChimeLog 'skip: sound file missing'
    Write-HookOk
    exit 0
}

# Debounce: stop + other hooks can race; one chime per ~2.5s
$lockFile = Join-Path $env:TEMP 'cursor-garri-chime.lock'
$now = Get-Date
try {
    if (Test-Path -LiteralPath $lockFile) {
        $lastRaw = Get-Content -LiteralPath $lockFile -ErrorAction SilentlyContinue | Select-Object -First 1
        $last = [datetime]::MinValue
        if ($lastRaw -and [datetime]::TryParse([string]$lastRaw, [ref]$last)) {
            if ($last.AddSeconds(2.5) -gt $now) {
                Write-ChimeLog 'skip: debounce'
                Write-HookOk
                exit 0
            }
        }
    }
    Set-Content -LiteralPath $lockFile -Value $now.ToString('o') -NoNewline
}
catch { }

# ASCII temp copy — avoids job/path quirks with Cyrillic workspace folder
$ext = [IO.Path]::GetExtension($soundFile).ToLowerInvariant()
$tempSound = Join-Path $env:TEMP ('cursor-garri-chime' + $ext)
try {
    Copy-Item -LiteralPath $soundFile -Destination $tempSound -Force
}
catch {
    $tempSound = $soundFile
}

try {
    if ($ext -eq '.wav') {
        $player = New-Object System.Media.SoundPlayer $tempSound
        $player.PlaySync()
        Write-ChimeLog ('ok: PlaySync wav from ' + $tempSound)
    }
    else {
        Add-Type -AssemblyName presentationCore
        $media = New-Object System.Windows.Media.MediaPlayer
        $ended = New-Object System.Threading.ManualResetEvent $false
        $media.add_MediaEnded({ param($s, $e) $ended.Set() })
        $media.Open([Uri]::new((Resolve-Path -LiteralPath $tempSound).Path))
        $media.Volume = 1.0
        $media.Play()
        $null = $ended.WaitOne([TimeSpan]::FromSeconds(12))
        $media.Close()
        Write-ChimeLog ('ok: MediaPlayer from ' + $tempSound)
    }
}
catch {
    Write-ChimeLog ('err: ' + $_.Exception.Message)
}

Write-HookOk
exit 0
