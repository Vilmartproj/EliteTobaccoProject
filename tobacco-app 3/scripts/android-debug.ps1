$ErrorActionPreference = 'Stop'

$androidStudioJbr = 'C:\Program Files\Android\Android Studio\jbr'
$defaultSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'

if ((-not $env:JAVA_HOME) -and (Test-Path $androidStudioJbr)) {
    $env:JAVA_HOME = $androidStudioJbr
}

if ($env:JAVA_HOME) {
    $env:Path = "$env:JAVA_HOME\bin;$env:Path"
}

if (-not $env:ANDROID_HOME -and (Test-Path $defaultSdk)) {
    $env:ANDROID_HOME = $defaultSdk
}

if (-not $env:ANDROID_SDK_ROOT -and $env:ANDROID_HOME) {
    $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
}

if (-not $env:JAVA_HOME) {
    throw 'JAVA_HOME is not set and Android Studio JBR was not found.'
}

if (-not $env:ANDROID_HOME) {
    throw 'ANDROID_HOME is not set and the default Android SDK path was not found.'
}

Write-Host "Using JAVA_HOME=$env:JAVA_HOME"
Write-Host "Using ANDROID_HOME=$env:ANDROID_HOME"

$repoRoot = Split-Path $PSScriptRoot -Parent
$androidDir = Join-Path $repoRoot 'android'

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command,
        [Parameter(Mandatory = $true)]
        [string]$FailureMessage
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw $FailureMessage
    }
}

Push-Location $repoRoot
try {
    Invoke-Step -Command { npm run build:mobile } -FailureMessage 'Mobile web build failed.'
    Invoke-Step -Command { npm run cap:sync } -FailureMessage 'Capacitor sync failed.'

    Push-Location $androidDir
    try {
        Invoke-Step -Command { .\gradlew.bat assembleDebug } -FailureMessage 'Android debug assembly failed.'
    }
    finally {
        Pop-Location
    }
}
finally {
    Pop-Location
}