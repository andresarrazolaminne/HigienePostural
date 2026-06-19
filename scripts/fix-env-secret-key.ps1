# Corrige SECRET_KEY en .env si esta vacia, es placeholder, es sk-* o coincide con OPENAI_API_KEY.
param([string]$EnvFile = "")

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not $EnvFile) { $EnvFile = Join-Path $root ".env" }

if (-not (Test-Path $EnvFile)) {
    Write-Error "No existe $EnvFile. Copia .env.example primero."
}

function New-SecretKey {
    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

$lines = Get-Content $EnvFile -Encoding UTF8
$map = @{}
foreach ($line in $lines) {
    $t = $line.Trim()
    if (-not $t -or $t.StartsWith("#")) { continue }
    $idx = $t.IndexOf("=")
    if ($idx -lt 1) { continue }
    $map[$t.Substring(0, $idx).Trim()] = $t.Substring($idx + 1).Trim()
}

$secret = $map["SECRET_KEY"]
$openai = $map["OPENAI_API_KEY"]
$bad = (-not $secret) -or ($secret -eq "change-me-to-a-long-random-string") -or ($secret -match '^sk-') -or ($openai -and $secret -eq $openai)

if (-not $bad) {
    Write-Host "SECRET_KEY ya es valida. No hay cambios."
    exit 0
}

$newSecret = New-SecretKey
$updated = $false
$out = foreach ($line in $lines) {
    if ($line -match '^\s*SECRET_KEY\s*=') {
        $updated = $true
        "SECRET_KEY=$newSecret"
    } else {
        $line
    }
}
if (-not $updated) {
    $out += "SECRET_KEY=$newSecret"
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines($EnvFile, $out, $utf8NoBom)

Write-Host "SECRET_KEY actualizada en $EnvFile"
Write-Host "OPENAI_API_KEY no se modifico."
Write-Host "Vuelve a ejecutar: .\deploy-lightsail.bat"
