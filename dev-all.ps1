# Inicia todo el stack de desarrollo:
# 1) API FastAPI en una NUEVA ventana de PowerShell (usa run.ps1).
# 2) Cliente Vite en ESTA ventana.
#
# Uso: .\dev-all.ps1
# Opcional: $env:PORT = 8765 antes de ejecutar (debe coincidir con run.ps1).

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
Set-Location $Root

$runPs1 = Join-Path $Root "run.ps1"
if (-not (Test-Path $runPs1)) {
    Write-Error "No se encontró run.ps1 en $Root"
}

$frontend = Join-Path $Root "frontend"
if (-not (Test-Path (Join-Path $frontend "package.json"))) {
    Write-Error "No se encontró frontend\package.json"
}

Write-Host ""
Write-Host "=== Higiene Postural · desarrollo ===" -ForegroundColor Cyan
Write-Host "Se abrirá otra ventana con la API. Esta ventana ejecutará el front (Vite)." -ForegroundColor Gray
Write-Host ""

Write-Host "Iniciando API (nueva ventana)..." -ForegroundColor Cyan
Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-NoExit",
    "-File",
    $runPs1
) | Out-Null

$portsToTry = [System.Collections.Generic.List[int]]::new()
if ($env:PORT -match "^\d+$") {
    $portsToTry.Add([int]$env:PORT) | Out-Null
}
foreach ($p in @(8080, 8000)) {
    if (-not $portsToTry.Contains($p)) {
        $portsToTry.Add($p) | Out-Null
    }
}

Write-Host "Esperando respuesta en /health (puertos: $($portsToTry -join ', '))..." -ForegroundColor Cyan
$deadline = (Get-Date).AddSeconds(60)
$apiPort = $null
while ((Get-Date) -lt $deadline) {
    foreach ($p in $portsToTry) {
        try {
            $u = "http://127.0.0.1:$p/health"
            $resp = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 2
            if ($resp.StatusCode -eq 200) {
                $apiPort = $p
                break
            }
        }
        catch {
            # sigue intentando
        }
    }
    if ($null -ne $apiPort) { break }
    Start-Sleep -Milliseconds 500
}

if ($null -eq $apiPort) {
    Write-Host "No se detectó la API a tiempo. Revisa la otra ventana (errores de puerto, venv, etc.)." -ForegroundColor Yellow
    Write-Host "Puedes lanzar el front igualmente con: cd frontend; npm run dev" -ForegroundColor Yellow
}
else {
    Write-Host "API lista en http://127.0.0.1:$apiPort" -ForegroundColor Green
    $py = Join-Path $Root ".venv\Scripts\python.exe"
    if (Test-Path $py) {
        Write-Host "Actualizando usuario demo admin@admin.co …" -ForegroundColor DarkGray
        & $py (Join-Path $Root "scripts\seed_demo.py") | Out-Null
    }
}

Set-Location $frontend

if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
    Write-Host "Instalando dependencias del front (primera vez)..." -ForegroundColor Cyan
    npm install
}

if (-not (Test-Path (Join-Path $frontend ".env"))) {
    if (Test-Path (Join-Path $frontend ".env.example")) {
        Copy-Item (Join-Path $frontend ".env.example") (Join-Path $frontend ".env")
        Write-Host "Creado frontend\.env desde .env.example (revisa VITE_API_URL)." -ForegroundColor Yellow
    }
}

$vitePort = 5173
Write-Host ""
Write-Host "Iniciando Vite en http://127.0.0.1:$vitePort ..." -ForegroundColor Green
Write-Host "Para detener solo el front: Ctrl+C. La API sigue en la otra ventana." -ForegroundColor DarkGray
Write-Host ""

try {
    npm run dev
}
finally {
    Write-Host ""
    Write-Host "Vite se detuvo. La API puede seguir activa en la otra ventana de PowerShell." -ForegroundColor Yellow
}
