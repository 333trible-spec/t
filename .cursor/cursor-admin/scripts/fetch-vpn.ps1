#Requires -Version 5.1
<#
.SYNOPSIS
  Detect Happ VPN / proxy client status on Windows (processes, proxy, TUN).
#>
param(
    [string]$OutFile = (Join-Path $PSScriptRoot "..\vpn.json")
)

$ErrorActionPreference = "SilentlyContinue"

$happProcessNames = @("Happ", "happd", "sing-box", "xray", "tun2proxy-bin")
$running = @(
    Get-Process -ErrorAction SilentlyContinue |
    Where-Object { $happProcessNames -contains $_.ProcessName } |
    ForEach-Object { $_.ProcessName } |
    Sort-Object -Unique
)

$installCandidates = @(
    (Join-Path $env:APPDATA "Happ"),
    (Join-Path ${env:ProgramFiles} "FlyFrogLLC\Happ"),
    (Join-Path ${env:ProgramFiles(x86)} "FlyFrogLLC\Happ")
)

$installed = $false
$installPath = $null
foreach ($candidate in $installCandidates) {
    if ($candidate -and (Test-Path $candidate)) {
        $installed = $true
        $installPath = $candidate
        break
    }
}

$proxyEnabled = $false
$proxyServer = $null
try {
    $proxy = Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings"
    if ($proxy.ProxyEnable -eq 1) {
        $proxyEnabled = $true
        $proxyServer = [string]$proxy.ProxyServer
    }
}
catch { }

$tunAdapters = @()
try {
    $tunAdapters = @(
        Get-NetAdapter -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Status -eq "Up" -and (
                $_.Name -match "happ|tun|sing|wintun|meta|wireguard" -or
                $_.InterfaceDescription -match "happ|tun|sing|wintun|meta|wireguard"
            )
        } |
        ForEach-Object { $_.Name }
    )
}
catch { }

$hasTunnelProc = @($running | Where-Object { $_ -in @("sing-box", "xray", "tun2proxy-bin") }).Count -gt 0
$hasHappUi = $running -contains "Happ"
$hasHappSvc = $running -contains "happd"

$status = "disconnected"
$isConnected = $false

if ($tunAdapters.Count -gt 0 -or $hasTunnelProc) {
    $status = "connected"
    $isConnected = $true
}
elseif ($proxyEnabled -and ($hasHappUi -or $hasHappSvc -or $hasTunnelProc)) {
    $status = "connected"
    $isConnected = $true
}
elseif ($hasHappUi -or $hasHappSvc) {
    $status = "idle"
}

$geo = $null
if ($isConnected -and $proxyServer) {
    $proxyUrl = $proxyServer
    if ($proxyUrl -notmatch "^https?://") {
        $proxyUrl = "http://$proxyUrl"
    }
    try {
        $g = Invoke-RestMethod -Uri "http://ip-api.com/json/?fields=status,country,countryCode,city,query" -Proxy $proxyUrl -TimeoutSec 12
        if ($g.status -eq "success") {
            $geo = [ordered]@{
                country     = [string]$g.country
                countryCode = [string]$g.countryCode
                city        = [string]$g.city
                exitIp      = [string]$g.query
            }
        }
    }
    catch { }
}

$result = [ordered]@{
    fetchedAt           = (Get-Date).ToString("s")
    client              = "Happ"
    installed           = $installed
    installPath         = $installPath
    status              = $status
    isConnected         = $isConnected
    requestsThroughVpn  = $isConnected
    processes           = $running
    systemProxyEnabled  = $proxyEnabled
    systemProxyServer   = $proxyServer
    tunAdapters         = $tunAdapters
    geo                 = $geo
}

$json = $result | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($OutFile, $json, [System.Text.UTF8Encoding]::new($false))
Write-Output $json
