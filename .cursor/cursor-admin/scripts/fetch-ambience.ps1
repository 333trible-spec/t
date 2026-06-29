#Requires -Version 5.1
<#
.SYNOPSIS
  Time and weather for Tyumen (Open-Meteo, no API key).
#>
param(
    [string]$OutFile = (Join-Path $PSScriptRoot "..\ambience.json"),
    [int]$MaxAgeMinutes = 30
)

$ErrorActionPreference = "SilentlyContinue"

if (Test-Path $OutFile) {
    try {
        $existing = Get-Content $OutFile -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($existing.fetchedAt) {
            $age = ((Get-Date) - [datetime]$existing.fetchedAt).TotalMinutes
            if ($age -lt $MaxAgeMinutes) {
                Write-Output ($existing | ConvertTo-Json -Depth 5 -Compress)
                exit 0
            }
        }
    }
    catch { }
}

$tzId = "Asia/Yekaterinburg"
$lat = 57.1522
$lon = 65.5272

try {
    $tz = [TimeZoneInfo]::FindSystemTimeZoneById("Ekaterinburg Standard Time")
}
catch {
    $tz = [TimeZoneInfo]::FindSystemTimeZoneById("Asia/Yekaterinburg")
}

$nowUtc = [DateTime]::UtcNow
$nowLocal = [TimeZoneInfo]::ConvertTimeFromUtc($nowUtc, $tz)
$timeLocal = $nowLocal.ToString("HH:mm")
$dateLocal = $nowLocal.ToString("yyyy-MM-dd")

function Get-WeatherLabel {
    param([int]$Code)
    switch ($Code) {
        0 { return "clear" }
        1 { return "mostly_clear" }
        2 { return "partly_cloudy" }
        3 { return "overcast" }
        45 { return "fog" }
        48 { return "rime_fog" }
        51 { return "drizzle_light" }
        53 { return "drizzle" }
        55 { return "drizzle_heavy" }
        61 { return "rain_light" }
        63 { return "rain" }
        65 { return "rain_heavy" }
        71 { return "snow_light" }
        73 { return "snow" }
        75 { return "snow_heavy" }
        80 { return "showers" }
        81 { return "showers_heavy" }
        95 { return "thunderstorm" }
        default { return "unknown" }
    }
}

function Chars([int[]]$codes) {
    -join ($codes | ForEach-Object { [char]$_ })
}

function Get-WeatherRu {
    param([string]$Label)
    switch ($Label) {
        "clear" { return Chars @(0x044F, 0x0441, 0x043D, 0x043E) }
        "mostly_clear" { return Chars @(0x043F, 0x0440, 0x0435, 0x0438, 0x043C, 0x0443, 0x0449, 0x0435, 0x0441, 0x0442, 0x0432, 0x0435, 0x043D, 0x043D, 0x043E, 0x0020, 0x044F, 0x0441, 0x043D, 0x043E) }
        "partly_cloudy" { return Chars @(0x043F, 0x0435, 0x0440, 0x0435, 0x043C, 0x0435, 0x043D, 0x043D, 0x0430, 0x044F, 0x0020, 0x043E, 0x0431, 0x043B, 0x0430, 0x0447, 0x043D, 0x043E, 0x0441, 0x0442, 0x044C) }
        "overcast" { return Chars @(0x043F, 0x0430, 0x0441, 0x043C, 0x0443, 0x0440, 0x043D, 0x043E) }
        "fog" { return Chars @(0x0442, 0x0443, 0x043C, 0x0430, 0x043D) }
        "rime_fog" { return Chars @(0x0438, 0x0437, 0x043C, 0x043E, 0x0440, 0x043E, 0x0437, 0x0438) }
        "drizzle_light" { return Chars @(0x043C, 0x043E, 0x0440, 0x043E, 0x0441, 0x044C) }
        "drizzle" { return Chars @(0x043C, 0x043E, 0x0440, 0x043E, 0x0441, 0x044C) }
        "drizzle_heavy" { return Chars @(0x0441, 0x0438, 0x043B, 0x044C, 0x043D, 0x0430, 0x044F, 0x0020, 0x043C, 0x043E, 0x0440, 0x043E, 0x0441, 0x044C) }
        "rain_light" { return Chars @(0x043D, 0x0435, 0x0431, 0x043E, 0x043B, 0x044C, 0x0448, 0x043E, 0x0439, 0x0020, 0x0434, 0x043E, 0x0436, 0x0434, 0x044C) }
        "rain" { return Chars @(0x0434, 0x043E, 0x0436, 0x0434, 0x044C) }
        "rain_heavy" { return Chars @(0x0441, 0x0438, 0x043B, 0x044C, 0x043D, 0x044B, 0x0439, 0x0020, 0x0434, 0x043E, 0x0436, 0x0434, 0x044C) }
        "snow_light" { return Chars @(0x043D, 0x0435, 0x0431, 0x043E, 0x043B, 0x044C, 0x0448, 0x043E, 0x0439, 0x0020, 0x0441, 0x043D, 0x0435, 0x0433) }
        "snow" { return Chars @(0x0441, 0x043D, 0x0435, 0x0433) }
        "snow_heavy" { return Chars @(0x0441, 0x043D, 0x0435, 0x0433, 0x043E, 0x043F, 0x0430, 0x0434) }
        "showers" { return Chars @(0x043B, 0x0438, 0x0432, 0x043D, 0x0438) }
        "showers_heavy" { return Chars @(0x0441, 0x0438, 0x043B, 0x044C, 0x043D, 0x044B, 0x0435, 0x0020, 0x043B, 0x0438, 0x0432, 0x043D, 0x0438) }
        "thunderstorm" { return Chars @(0x0433, 0x0440, 0x043E, 0x0437, 0x0430) }
        default { return Chars @(0x2014) }
    }
}

$weather = $null
$apiUrl = "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Asia%2FYekaterinburg&forecast_days=1"

try {
    $w = Invoke-RestMethod -Uri $apiUrl -TimeoutSec 15
    if ($w.current) {
        $label = Get-WeatherLabel -Code ([int]$w.current.weather_code)
        $weather = [ordered]@{
            tempC          = [math]::Round([double]$w.current.temperature_2m, 0)
            feelsLikeC     = [math]::Round([double]$w.current.apparent_temperature, 0)
            weatherCode    = [int]$w.current.weather_code
            weatherLabel   = $label
            weatherRu      = Get-WeatherRu -Label $label
            windKmh        = [math]::Round([double]$w.current.wind_speed_10m, 0)
        }
    }
}
catch { }

$hour = $nowLocal.Hour
$dayPart = if ($hour -ge 5 -and $hour -lt 12) { "morning" }
elseif ($hour -ge 12 -and $hour -lt 17) { "day" }
elseif ($hour -ge 17 -and $hour -lt 22) { "evening" }
else { "night" }

$result = [ordered]@{
    fetchedAt  = (Get-Date).ToString("s")
    city       = "Tyumen"
    cityRu     = (Chars @(0x0422, 0x044E, 0x043C, 0x0435, 0x043D, 0x044C))
    timezone   = $tzId
    timeLocal  = $timeLocal
    dateLocal  = $dateLocal
    dayPart    = $dayPart
    weather    = $weather
    source     = "open-meteo"
}

$json = $result | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($OutFile, $json, [System.Text.UTF8Encoding]::new($false))
Write-Output $json
