# Despliegue completo a Lightsail (Virginia = us-east-1).
# Uso: .\deploy-lightsail.ps1
# Requiere: .env con SECRET_KEY y OPENAI_API_KEY, Docker, AWS CLI, lightsailctl.exe

param(
    [string]$Region = "us-east-1",
    [string]$ServiceName = "oya-app"
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
Set-Location $root
$env:PATH = "$root;$env:PATH"

Write-Host ""
Write-Host "============================================================"
Write-Host " Higiene Postural - Despliegue Lightsail (monolito)"
Write-Host " Servicio: $ServiceName   Region: $Region (Virginia)"
Write-Host "============================================================"
Write-Host ""

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    throw "AWS CLI no encontrado. Ejecuta: aws configure"
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker no encontrado. Inicia Docker Desktop."
}
if (-not (Test-Path "$root\lightsailctl.exe")) {
    throw "Falta lightsailctl.exe en la raiz del proyecto."
}
if (-not (Test-Path "$root\.env")) {
    throw "Falta .env en la raiz. Copia .env.example y define SECRET_KEY y OPENAI_API_KEY."
}

& "$root\scripts\generate-lightsail-deployment.ps1" -ServiceName $ServiceName -Region $Region
$deployFile = Join-Path $root "lightsail\containers.generated.json"

Write-Host "[1/4] Login registro Lightsail..."
aws lightsail create-container-service-registry-login --region $Region
if ($LASTEXITCODE -ne 0) { throw "Fallo login Lightsail" }

Write-Host ""
Write-Host "[2/4] Build imagen monolito (API + nginx)..."
docker build -f Dockerfile.monolith --build-context frontend=./frontend -t hp-app:deploy .
if ($LASTEXITCODE -ne 0) { throw "Fallo build monolito" }

Write-Host ""
Write-Host "[3/4] Push imagen app..."
aws lightsail push-container-image --service-name $ServiceName --label app --image hp-app:deploy --region $Region
if ($LASTEXITCODE -ne 0) { throw "Fallo push app" }

Write-Host ""
Write-Host "Esperando despliegue anterior si existe..."
& "$root\scripts\wait-lightsail-deploy.ps1" -ServiceName $ServiceName -Region $Region
if ($LASTEXITCODE -ne 0) { throw "Timeout esperando despliegue anterior" }

Write-Host ""
Write-Host "[4/4] Crear despliegue (variables desde .env)..."
$deployPath = (Resolve-Path $deployFile).Path -replace '\\', '/'
aws lightsail create-container-service-deployment `
    --service-name $ServiceName `
    --cli-input-json "file://$deployPath" `
    --region $Region
if ($LASTEXITCODE -ne 0) { throw "Fallo create-container-service-deployment" }

Write-Host ""
Write-Host "============================================================"
Write-Host " Despliegue enviado. Health check: GET /health"
Write-Host "============================================================"
$url = aws lightsail get-container-services --service-name $ServiceName --region $Region --query "containerServices[0].url" --output text 2>$null
if ($url) {
    Write-Host "URL: $url"
    Write-Host "Actualiza CORS_ORIGINS en .env con esa URL y vuelve a desplegar si hace falta."
}
Write-Host ""
Write-Host "Monta volumen persistente en /data en el contenedor app (Lightsail console)."
Write-Host ""
