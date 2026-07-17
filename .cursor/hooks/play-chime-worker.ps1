#Requires -Version 5.1
# Worker: play chime to the end (launched outside Cursor job)
param(
    [Parameter(Mandatory = $true)]
    [string]$Path
)

$ErrorActionPreference = 'SilentlyContinue'
try {
    if (-not (Test-Path -LiteralPath $Path)) { exit 0 }
    $ext = [IO.Path]::GetExtension($Path).ToLowerInvariant()
    if ($ext -eq '.wav') {
        $player = New-Object System.Media.SoundPlayer $Path
        $player.PlaySync()
        exit 0
    }
    Add-Type -AssemblyName presentationCore
    $media = New-Object System.Windows.Media.MediaPlayer
    $ended = New-Object System.Threading.ManualResetEvent $false
    $media.add_MediaEnded({ param($s, $e) $ended.Set() })
    $media.Open([Uri]::new((Resolve-Path -LiteralPath $Path).Path))
    $media.Volume = 1.0
    $media.Play()
    $null = $ended.WaitOne([TimeSpan]::FromSeconds(12))
    $media.Close()
}
catch { }
exit 0
