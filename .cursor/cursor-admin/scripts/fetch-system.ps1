#Requires -Version 5.1
<#
.SYNOPSIS
  Windows system snapshot: OS, RAM, disk, uptime, Cursor version, top processes.
#>
param(
    [string]$OutFile = (Join-Path $PSScriptRoot "..\system.json"),
    [string]$ContextFile = (Join-Path $PSScriptRoot "..\context.md"),
    [switch]$UpdateContext
)

$ErrorActionPreference = "SilentlyContinue"

function Chars([int[]]$codes) {
    -join ($codes | ForEach-Object { [char]$_ })
}

$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1

$bootTime = $os.LastBootUpTime
$uptimeHours = if ($bootTime) {
    [math]::Round(((Get-Date) - $bootTime).TotalHours, 1)
}
else { $null }

$totalRamGb = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1)
$freeRamGb = [math]::Round($os.FreePhysicalMemory / 1048576, 1)
$usedRamGb = [math]::Round($totalRamGb - $freeRamGb, 1)
$ramUsedPct = if ($totalRamGb -gt 0) { [math]::Round(($usedRamGb / $totalRamGb) * 100, 0) } else { $null }

$diskC = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$diskTotalGb = if ($diskC) { [math]::Round($diskC.Size / 1GB, 1) } else { $null }
$diskFreeGb = if ($diskC) { [math]::Round($diskC.FreeSpace / 1GB, 1) } else { $null }
$diskUsedPct = if ($diskC -and $diskC.Size -gt 0) {
    [math]::Round((1 - $diskC.FreeSpace / $diskC.Size) * 100, 0)
}
else { $null }

$cursorVersion = $null
$cursorPaths = @(
    (Join-Path $env:LOCALAPPDATA "Programs\cursor\resources\app\package.json"),
    (Join-Path $env:LOCALAPPDATA "Programs\Cursor\resources\app\package.json"),
    (Join-Path $env:LOCALAPPDATA "cursor\resources\app\package.json")
)
foreach ($pkgPath in $cursorPaths) {
    if ($pkgPath -and (Test-Path $pkgPath)) {
        try {
            $pkg = Get-Content $pkgPath -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($pkg.version) { $cursorVersion = [string]$pkg.version; break }
        }
        catch { }
    }
}

$topMemory = @(
    Get-Process -ErrorAction SilentlyContinue |
    Sort-Object WorkingSet64 -Descending |
    Select-Object -First 5 |
    ForEach-Object {
        [ordered]@{
            name     = $_.ProcessName
            memoryMb = [int][math]::Round($_.WorkingSet64 / 1MB, 0)
        }
    }
)

function Get-GpuSnapshot {
    $gpus = [System.Collections.Generic.List[object]]::new()

    $nvidiaSmi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
    if ($nvidiaSmi) {
        $raw = & nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu --format=csv,noheader,nounits 2>$null
        if ($raw) {
            foreach ($line in @($raw)) {
                $line = $line.Trim()
                if (-not $line) { continue }
                $p = $line -split ',\s*'
                if ($p.Count -lt 2) { continue }
                $temp = $null
                if ($p[1] -match '^\d+(\.\d+)?$') { $temp = [int][math]::Round([double]$p[1]) }
                $util = $null
                if ($p.Count -ge 3 -and $p[2] -match '^\d+(\.\d+)?$') { $util = [int][math]::Round([double]$p[2]) }
                $gpus.Add([ordered]@{
                    name           = $p[0].Trim()
                    temperatureC   = $temp
                    utilizationPct = $util
                    source         = 'nvidia-smi'
                })
            }
        }
    }

    if ($gpus.Count -eq 0) {
        Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -and $_.Name -notmatch 'Microsoft|Basic|Remote' } |
        ForEach-Object {
            $gpus.Add([ordered]@{
                name         = $_.Name
                temperatureC = $null
                source       = 'wmi'
                note         = 'install NVIDIA drivers + nvidia-smi for GPU temperature'
            })
        }
    }

    return @($gpus)
}

$gpuList = Get-GpuSnapshot

$warnings = @()
if ($ramUsedPct -ge 90) { $warnings += "ram_high" }
if ($diskUsedPct -ge 90) { $warnings += "disk_c_high" }
if ($diskFreeGb -ne $null -and $diskFreeGb -lt 10) { $warnings += "disk_c_low_space" }
foreach ($g in $gpuList) {
    if ($null -ne $g.temperatureC -and $g.temperatureC -ge 85) { $warnings += "gpu_hot" }
}

$health = "ok"
if ($warnings.Count -gt 0) { $health = "warning" }

$result = [ordered]@{
    fetchedAt     = (Get-Date).ToString("s")
    health        = $health
    warnings      = $warnings
    computerName  = $env:COMPUTERNAME
    osName        = $os.Caption
    osVersion     = $os.Version
    osBuild       = $os.BuildNumber
    cpuName       = $cpu.Name
    cpuLoadPct    = $cpu.LoadPercentage
    uptimeHours   = $uptimeHours
    memory        = [ordered]@{
        totalGb   = $totalRamGb
        usedGb    = $usedRamGb
        freeGb    = $freeRamGb
        usedPct   = $ramUsedPct
    }
    diskC         = [ordered]@{
        totalGb   = $diskTotalGb
        freeGb    = $diskFreeGb
        usedPct   = $diskUsedPct
    }
    cursorVersion = $cursorVersion
    topMemory     = $topMemory
    gpu           = $gpuList
}

$json = [ordered]@{
    fetchedAt     = $result.fetchedAt
    health        = $result.health
    warnings      = $result.warnings
    computerName  = $result.computerName
    osName        = $result.osName
    osVersion     = $result.osVersion
    osBuild       = $result.osBuild
    cpuName       = $result.cpuName
    cpuLoadPct    = $result.cpuLoadPct
    uptimeHours   = $result.uptimeHours
    memory        = $result.memory
    diskC         = $result.diskC
    cursorVersion = $result.cursorVersion
    topMemory     = $result.topMemory
    gpu           = @($gpuList)
} | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($OutFile, $json, [System.Text.UTF8Encoding]::new($false))
Write-Output $json

if ($UpdateContext -and (Test-Path $ContextFile)) {
    $em = Chars @(0x2014)
    $checked = Get-Date -Format "dd.MM.yyyy"
    $p1 = Chars @(0x041F, 0x0430, 0x0440, 0x0430, 0x043C, 0x0435, 0x0442, 0x0440)
    $p2 = Chars @(0x0417, 0x043D, 0x0430, 0x0447, 0x0435, 0x043D, 0x0438, 0x0435)

    $healthRu = switch ($health) {
        "ok" { Chars @(0x041E, 0x041A) }
        "warning" { Chars @(0x0432, 0x043D, 0x0438, 0x043C, 0x0430, 0x043D, 0x0438, 0x0435) }
        default { $health }
    }

    $ramText = if ($null -ne $ramUsedPct) { "$usedRamGb / $totalRamGb GB ($ramUsedPct%)" } else { $em }
    $diskText = if ($null -ne $diskUsedPct) { "$diskFreeGb GB $(Chars @(0x0441, 0x0432, 0x043E, 0x0431, 0x043E, 0x0434, 0x043D, 0x043E)) ($diskUsedPct%)" } else { $em }
    $uptimeText = if ($uptimeHours) { "$uptimeHours $(Chars @(0x0447))" } else { $em }
    $cpuText = if ($cpu.LoadPercentage -ne $null) { "$($cpu.LoadPercentage)%" } else { $em }
    $cursorText = if ($cursorVersion) { $cursorVersion } else { $em }
    $topText = if ($topMemory.Count -gt 0) {
        ($topMemory | ForEach-Object { "$($_.name) $($_.memoryMb)MB" }) -join ", "
    }
    else { $em }

    $gpuText = if ($gpuList.Count -gt 0) {
        ($gpuList | ForEach-Object {
            if ($null -ne $_.temperatureC) {
                "$($_.name) $($_.temperatureC)$(Chars @(0x00B0))C"
            }
            else {
                "$($_.name) $(Chars @(0x2014)) $(Chars @(0x043D, 0x0435, 0x0442, 0x0020, 0x0434, 0x0430, 0x043D, 0x043D, 0x044B, 0x0445))"
            }
        }) -join "; "
    }
    else { $em }

    $pcHeader = "## " + (Chars @(0x041A, 0x043E, 0x043C, 0x043F, 0x044C, 0x044E, 0x0442, 0x0435, 0x0440)) + " (Windows)"
    $pcBlock = @"
$pcHeader

| $p1 | $p2 |
|----------|----------|
| $(Chars @(0x0421, 0x043E, 0x0441, 0x0442, 0x043E, 0x044F, 0x043D, 0x0438, 0x0435)) | **$healthRu** |
| $(Chars @(0x041E, 0x0421)) | $($os.Caption) ($($os.Version)) |
| $(Chars @(0x041F, 0x0430, 0x043C, 0x044F, 0x0442, 0x044C)) | $ramText |
| $(Chars @(0x0414, 0x0438, 0x0441, 0x043A, 0x0020, 0x0043, 0x003A)) | $diskText |
| CPU | $cpuText |
| GPU | $gpuText |
| $(Chars @(0x0410, 0x043F, 0x0442, 0x0430, 0x0439, 0x043C)) | $uptimeText |
| $(Chars @(0x0422, 0x043E, 0x043F, 0x0020, 0x0052, 0x0041, 0x004D)) | $topText |
| $(Chars @(0x041F, 0x043E, 0x0441, 0x043B, 0x0435, 0x0434, 0x043D, 0x044F, 0x044F, 0x0020, 0x043F, 0x0440, 0x043E, 0x0432, 0x0435, 0x0440, 0x043A, 0x0430)) | $checked |
"@

    $ctx = Get-Content $ContextFile -Raw -Encoding UTF8
    $sredaHeader = "## " + (Chars @(0x0421, 0x0440, 0x0435, 0x0434, 0x0430))
    $pcHeaderEsc = [regex]::Escape($pcHeader)
    $sredaEsc = [regex]::Escape($sredaHeader)

    if ($ctx -match $pcHeaderEsc) {
        $ctx = [regex]::Replace($ctx, "(?s)$pcHeaderEsc.*?(?=\r?\n$sredaEsc)", ($pcBlock.TrimEnd() + "`n"))
    }
    else {
        $ctx = [regex]::Replace($ctx, "(?s)$sredaEsc", ($pcBlock.TrimEnd() + "`n`n$sredaHeader"))
    }

    $cursorRow = "| $(Chars @(0x0412, 0x0435, 0x0440, 0x0441, 0x0438, 0x044F, 0x0020, 0x0043, 0x0075, 0x0072, 0x0073, 0x006F, 0x0072)) | $cursorText |"
    $ctx = [regex]::Replace($ctx, "(?m)^\| $(Chars @(0x0412, 0x0435, 0x0440, 0x0441, 0x0438, 0x044F, 0x0020, 0x0043, 0x0075, 0x0072, 0x0073, 0x006F, 0x0072)) \|.*$", $cursorRow)

    [System.IO.File]::WriteAllText($ContextFile, $ctx, [System.Text.UTF8Encoding]::new($true))
}
