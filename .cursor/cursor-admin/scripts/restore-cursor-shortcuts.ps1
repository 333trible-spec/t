# Emergency only: put Cursor.lnk TargetPath back to Cursor.exe.
# Do NOT run unless the user says a shortcut is broken and asks to restore it.
# Never point shortcuts at start-cursor.cmd or any other wrapper.
$ErrorActionPreference = 'Stop'

function Get-CursorExePath {
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\cursor\Cursor.exe'),
        (Join-Path ${env:ProgramFiles} 'Cursor\Cursor.exe')
    )
    return ,@($candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1)
}

$cursorExe = Get-CursorExePath
if (-not $cursorExe) { throw 'Cursor.exe not found' }

$workDir = Split-Path $cursorExe -Parent
$sh = New-Object -ComObject WScript.Shell
$shortcutPaths = @(
    (Join-Path $env:USERPROFILE 'Desktop\Cursor.lnk'),
    (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Cursor.lnk'),
    (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Cursor\Cursor.lnk')
)

foreach ($lnkPath in $shortcutPaths) {
    if (-not (Test-Path -LiteralPath $lnkPath)) { continue }
    $lnk = $sh.CreateShortcut($lnkPath)
    $lnk.TargetPath = $cursorExe
    $lnk.Arguments = ''
    $lnk.WorkingDirectory = $workDir
    $lnk.IconLocation = "$cursorExe,0"
    $lnk.Description = 'Cursor'
    $lnk.Save()
    Write-Host "OK shortcut: $lnkPath -> $cursorExe"
}

$taskName = 'CursorAgentColorsGuard'
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "OK removed scheduled task: $taskName"
}

Write-Host 'Done. Launch Cursor via Desktop or Start Menu — target is Cursor.exe again.'
