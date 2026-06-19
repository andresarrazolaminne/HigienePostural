# Pruebas del stack Docker local (ejecutar con contenedores levantados).
param(
    [string]$AppUrl = "",
    [string]$ApiUrl = "http://localhost:9081"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $AppUrl) {
    $wp = if ($env:WEB_PORT) { $env:WEB_PORT } else { "9080" }
    $AppUrl = "http://localhost:$wp"
}

$failed = 0
function Assert-Ok($name, $cond, [string]$detail = "") {
    if ($cond) {
        Write-Host "[OK] $name"
    } else {
        Write-Host "[FAIL] $name $detail"
        $script:failed++
    }
}

Write-Host "Smoke test: $AppUrl (API $ApiUrl)"
Write-Host ""

# 1. API health directa
try {
    $h = Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 10
    Assert-Ok "API /health" ($h.status -eq "ok")
} catch {
    Assert-Ok "API /health" $false $_.Exception.Message
}

# 2. API health via nginx
try {
    $h2 = Invoke-RestMethod -Uri "$AppUrl/health" -TimeoutSec 10
    Assert-Ok "Nginx proxy /health" ($h2.status -eq "ok")
} catch {
    Assert-Ok "Nginx proxy /health" $false $_.Exception.Message
}

# 3. index.html y assets
try {
    $html = (Invoke-WebRequest -Uri "$AppUrl/" -UseBasicParsing -TimeoutSec 10).Content
    Assert-Ok "index.html" ($html -match "id=`"root`"")
    if ($html -match 'src="([^"]+\.js)"') {
        $src = $Matches[1]
        $assetUrl = if ($src.StartsWith("http")) { $src } elseif ($src.StartsWith("/")) { "$AppUrl$src" } else { "$AppUrl/$($src -replace '^\./','')" }
        $js = Invoke-WebRequest -Uri $assetUrl -UseBasicParsing -TimeoutSec 15
        Assert-Ok "bundle JS ($src)" ($js.StatusCode -eq 200 -and $js.Content.Length -gt 10000)
        Assert-Ok "VITE base absoluto en build" ($src -match '^/assets/' -or $src -match '^\./assets/')
    } else {
        Assert-Ok "script en index" $false
    }
} catch {
    Assert-Ok "frontend estatico" $false $_.Exception.Message
}

# 4. Login API (OAuth2 form: username + password)
try {
    $form = "username=inspector@demo.co&password=inspector123"
    $login = Invoke-RestMethod -Uri "$AppUrl/auth/login" -Method Post -Body $form -ContentType "application/x-www-form-urlencoded" -TimeoutSec 15
    Assert-Ok "POST /auth/login" ($null -ne $login.access_token)
} catch {
    Assert-Ok "POST /auth/login" $false $_.Exception.Message
}

# 5. /auth/me con token
try {
    $form = "username=inspector@demo.co&password=inspector123"
    $login = Invoke-RestMethod -Uri "$AppUrl/auth/login" -Method Post -Body $form -ContentType "application/x-www-form-urlencoded"
    $me = Invoke-RestMethod -Uri "$AppUrl/auth/me" -Headers @{ Authorization = "Bearer $($login.access_token)" }
    Assert-Ok "GET /auth/me" ($me.email -eq "inspector@demo.co")
} catch {
    Assert-Ok "GET /auth/me" $false $_.Exception.Message
}

# 6. SPA /login responde HTML
try {
    $loginHtml = (Invoke-WebRequest -Uri "$AppUrl/login" -UseBasicParsing -TimeoutSec 10).Content
    Assert-Ok "SPA /login" ($loginHtml -match "root")
} catch {
    Assert-Ok "SPA /login" $false $_.Exception.Message
}

Write-Host ""
if ($failed -eq 0) {
    Write-Host "Todas las pruebas pasaron. Abre $AppUrl/login en el navegador."
    exit 0
}
Write-Host "$failed prueba(s) fallaron."
exit 1
