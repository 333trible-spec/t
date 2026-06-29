#Requires -Version 5.1
<#
.SYNOPSIS
  Read Cursor subscription: state.vscdb + api2.cursor.sh. Token not saved to JSON.
#>
param(
    [string]$OutFile = (Join-Path $PSScriptRoot "..\subscription.json")
)

$ErrorActionPreference = "Stop"

$PlanLabels = @{
    free       = "Hobby (Free)"
    pro        = "Pro"
    pro_plus   = "Pro+"
    ultra      = "Ultra"
    enterprise = "Enterprise"
    free_trial = "Pro Trial"
}

$StatusLabels = @{
    active   = "active"
    canceled = "canceled"
    past_due = "past_due"
    trialing = "trialing"
    unpaid   = "unpaid"
}

function Get-StateDbPath {
    Join-Path $env:APPDATA "Cursor\User\globalStorage\state.vscdb"
}

function Get-StorageFromDb {
    param([string]$DbPath)
    if (-not (Test-Path $DbPath)) {
        throw "Cursor database not found: $DbPath"
    }

    $fs = [IO.File]::Open($DbPath, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
    try {
        $bytes = New-Object byte[] $fs.Length
        [void]$fs.Read($bytes, 0, $fs.Length)
    }
    finally {
        $fs.Close()
    }

    $text = [Text.Encoding]::UTF8.GetString($bytes)
    $result = @{}

    if ($text -match 'cursorAuth/accessToken[^\x00]{0,32}(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)') {
        $result['cursorAuth/accessToken'] = $Matches[1]
    }
    if ($text -match 'cursorAuth/stripeMembershipType[^\x00]{0,16}(free_trial|pro_plus|enterprise|ultra|free|pro)') {
        $result['cursorAuth/stripeMembershipType'] = $Matches[1]
    }
    if ($text -match 'cursorAuth/stripeSubscriptionStatus[^\x00]{0,16}(active|canceled|past_due|trialing|unpaid)') {
        $result['cursorAuth/stripeSubscriptionStatus'] = $Matches[1]
    }
    if ($text -match 'cursorAuth/cachedEmail.{0,32}?([a-zA-Z0-9._%+-]{3,}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})') {
        $result['cursorAuth/cachedEmail'] = $Matches[1]
    }
    if (-not $result['cursorAuth/cachedEmail']) {
        $emailMatches = [regex]::Matches($text, '[a-zA-Z0-9._%+-]{3,}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
        if ($emailMatches.Count -gt 0) {
            $best = $emailMatches | ForEach-Object { $_.Value } | Sort-Object { $_.Length } -Descending | Select-Object -First 1
            $result['cursorAuth/cachedEmail'] = $best
        }
    }

    return $result
}

function Invoke-CursorApi {
    param([string]$Path, [string]$Token)
    try {
        $headers = @{
            Authorization  = "Bearer $Token"
            "Content-Type" = "application/json"
        }
        return Invoke-RestMethod -Uri "https://api2.cursor.sh$Path" -Headers $headers -Method Get -TimeoutSec 15
    }
    catch {
        return @{ _error = $_.Exception.Message; _path = $Path }
    }
}

function Get-PeriodEnd {
    param($Profile, $Usage)
    foreach ($k in @("currentPeriodEnd", "periodEnd", "billingCycleEnd", "subscriptionEnd", "trialEnd")) {
        if ($Profile.PSObject.Properties.Name -contains $k -and $Profile.$k) {
            return [string]$Profile.$k
        }
    }
    if ($Usage -and $Usage.startOfMonth) {
        try {
            $start = [datetime]$Usage.startOfMonth
            return $start.AddMonths(1).ToString("yyyy-MM-dd")
        }
        catch { }
    }
    return $null
}

function Get-DaysUntil {
    param([string]$IsoDate)
    if (-not $IsoDate) { return $null }
    try {
        $end = [datetime]($IsoDate.Substring(0, 10))
        return ($end.Date - (Get-Date).Date).Days
    }
    catch { return $null }
}

$db = Get-StateDbPath
$storage = Get-StorageFromDb -DbPath $db

$membership = $storage["cursorAuth/stripeMembershipType"]
if (-not $membership) { $membership = "unknown" }
$status = $storage["cursorAuth/stripeSubscriptionStatus"]
if (-not $status) { $status = "unknown" }

$planLabel = $PlanLabels[$membership]
if (-not $planLabel) { $planLabel = $membership }
$statusLabel = $StatusLabels[$status]
if (-not $statusLabel) { $statusLabel = $status }

$result = [ordered]@{
    fetchedAt          = (Get-Date).ToString("s")
    source             = "local_db"
    email              = $storage["cursorAuth/cachedEmail"]
    membershipType     = $membership
    planLabel          = $planLabel
    subscriptionStatus = $status
    statusLabel        = $statusLabel
    isActive           = ($status -eq "active" -and $membership -ne "free")
}

$token = $storage["cursorAuth/accessToken"]
if ($token) {
    $profile = Invoke-CursorApi -Path "/auth/full_stripe_profile" -Token $token
    $usage = Invoke-CursorApi -Path "/auth/usage" -Token $token

    if ($profile -and -not $profile._error) {
        $result.source = "local_db+api"
        if ($profile.membershipType) {
            $result.membershipType = $profile.membershipType
            $result.planLabel = $PlanLabels[$profile.membershipType]
            if (-not $result.planLabel) { $result.planLabel = $profile.membershipType }
        }
        if ($profile.subscriptionStatus) {
            $result.subscriptionStatus = $profile.subscriptionStatus
            $result.statusLabel = $StatusLabels[$profile.subscriptionStatus]
            if (-not $result.statusLabel) { $result.statusLabel = $profile.subscriptionStatus }
        }
        $result.isActive = ($result.subscriptionStatus -eq "active" -and $result.membershipType -ne "free")
        $result.isTeamMember = [bool]$profile.isTeamMember
        $result.isOnStudentPlan = [bool]$profile.isOnStudentPlan
        $result.lastPaymentFailed = [bool]$profile.lastPaymentFailed

        $periodEnd = Get-PeriodEnd -Profile $profile -Usage $usage
        $result.periodEnd = $periodEnd
        $result.daysUntilPeriodEnd = Get-DaysUntil -IsoDate $periodEnd
    }
    elseif ($profile._error) {
        $result.apiError = $profile._error
    }

    if ($usage -and -not $usage._error) {
        $gpt = $usage."gpt-4"
        if (-not $gpt) { $gpt = $usage."gpt-4o" }
        $usageObj = [ordered]@{
            startOfMonth      = $usage.startOfMonth
            fastRequestsUsed  = $gpt.numRequests
            fastRequestsLimit = $gpt.maxRequestUsage
        }
        if ($null -ne $gpt.maxRequestUsage) {
            $used = if ($gpt.numRequests) { $gpt.numRequests } else { 0 }
            $usageObj.fastRequestsRemaining = [Math]::Max(0, $gpt.maxRequestUsage - $used)
        }
        $result.usage = $usageObj
    }
}
else {
    $result.warning = "No accessToken - sign in to Cursor. Local cache only."
}

$json = $result | ConvertTo-Json -Depth 6
$json | Set-Content -Path $OutFile -Encoding UTF8
Write-Output $json
