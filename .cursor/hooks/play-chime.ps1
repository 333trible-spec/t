#Requires -Version 5.1
# Cursor hook: stop — chime Disco Elysium (Гарри)
# Plays via a breakaway worker: Cursor often kills the hook (~0.5s) before PlaySync ends.
$ErrorActionPreference = 'SilentlyContinue'

function Write-HookOk {
    [Console]::Out.WriteLine('{}')
}

function Start-ChimeWorker {
    param(
        [string]$WorkerPath,
        [string]$SoundPath
    )

    $ps = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $arg = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}" -Path "{1}"' -f $WorkerPath, $SoundPath

    # 1) Prefer CreateProcess with BREAKAWAY_FROM_JOB so Cursor cannot kill playback.
    try {
        if (-not ('CursorChimeNative' -as [type])) {
            Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class CursorChimeNative {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct STARTUPINFO {
    public int cb; public string lpReserved; public string lpDesktop; public string lpTitle;
    public int dwX, dwY, dwXSize, dwYSize, dwXCountChars, dwYCountChars, dwFillAttribute, dwFlags;
    public short wShowWindow, cbReserved2; public IntPtr lpReserved2, hStdInput, hStdOutput, hStdError;
  }
  [StructLayout(LayoutKind.Sequential)]
  public struct PROCESS_INFORMATION {
    public IntPtr hProcess, hThread; public int dwProcessId, dwThreadId;
  }
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool CreateProcess(
    string lpApplicationName, string lpCommandLine, IntPtr lpProcessAttributes, IntPtr lpThreadAttributes,
    bool bInheritHandles, uint dwCreationFlags, IntPtr lpEnvironment, string lpCurrentDirectory,
    ref STARTUPINFO lpStartupInfo, out PROCESS_INFORMATION lpProcessInformation);
  [DllImport("kernel32.dll", SetLastError = true)] public static extern bool CloseHandle(IntPtr hObject);
  public const uint CREATE_BREAKAWAY_FROM_JOB = 0x01000000;
  public const uint CREATE_NO_WINDOW = 0x08000000;
  public const uint CREATE_NEW_PROCESS_GROUP = 0x00000200;
}
"@
        }

        $cmdLine = '"{0}" {1}' -f $ps, $arg
        $si = New-Object CursorChimeNative+STARTUPINFO
        $si.cb = [Runtime.InteropServices.Marshal]::SizeOf([type][CursorChimeNative+STARTUPINFO])
        $pi = New-Object CursorChimeNative+PROCESS_INFORMATION
        $flags = [CursorChimeNative]::CREATE_BREAKAWAY_FROM_JOB -bor [CursorChimeNative]::CREATE_NO_WINDOW -bor [CursorChimeNative]::CREATE_NEW_PROCESS_GROUP
        $ok = [CursorChimeNative]::CreateProcess($null, $cmdLine, [IntPtr]::Zero, [IntPtr]::Zero, $false, $flags, [IntPtr]::Zero, $null, [ref]$si, [ref]$pi)
        if ($ok) {
            if ($pi.hThread -ne [IntPtr]::Zero) { [void][CursorChimeNative]::CloseHandle($pi.hThread) }
            if ($pi.hProcess -ne [IntPtr]::Zero) { [void][CursorChimeNative]::CloseHandle($pi.hProcess) }
            return $true
        }
    }
    catch { }

    # 2) WScript.Shell.Run (async) — often escapes the IDE job.
    try {
        $wshell = New-Object -ComObject WScript.Shell
        $cmd = '"{0}" {1}' -f $ps, $arg
        $null = $wshell.Run($cmd, 0, $false)
        return $true
    }
    catch { }

    # 3) cmd start /b as last resort
    try {
        $cmdArgs = '/c start "" /b "{0}" {1}' -f $ps, $arg
        Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\cmd.exe') -ArgumentList $cmdArgs -WindowStyle Hidden | Out-Null
        return $true
    }
    catch { }

    return $false
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
                Write-HookOk
                exit 0
            }
        }
    }
    Set-Content -LiteralPath $lockFile -Value $now.ToString('o') -NoNewline
}
catch { }

$worker = Join-Path $PSScriptRoot 'play-chime-worker.ps1'
$null = Start-ChimeWorker -WorkerPath $worker -SoundPath $soundFile

Write-HookOk
exit 0
