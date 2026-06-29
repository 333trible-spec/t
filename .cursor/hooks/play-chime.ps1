#Requires -Version 5.1
# Cursor hook: afterAgentResponse — chime Disco Elysium (Гарри)
$ErrorActionPreference = 'SilentlyContinue'

# Hook protocol: read stdin JSON
if ([Console]::In.Peek() -ge 0) {
    $null = [Console]::In.ReadToEnd()
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
    exit 0
}

function Play-SoundToEnd {
    param([string]$Path)

    $ext = [IO.Path]::GetExtension($Path).ToLowerInvariant()

    if ($ext -eq '.wav') {
        $player = New-Object System.Media.SoundPlayer $Path
        $player.PlaySync()
        return
    }

    Add-Type -AssemblyName presentationCore
    $media = New-Object System.Windows.Media.MediaPlayer
    $ended = New-Object System.Threading.ManualResetEvent $false

    $handler = [System.Windows.Media.MediaPlayer+EventHandler]{
        param($sender, $e)
        $script:ended.Set()
    }
    $media.add_MediaEnded($handler)
    $media.Open([Uri]::new($Path))
    $media.Volume = 1.0
    $media.Play()

    $null = $ended.WaitOne([TimeSpan]::FromSeconds(30))
    $media.Close()
}

try {
    Play-SoundToEnd -Path $soundFile
} catch {
    exit 0
}

exit 0
