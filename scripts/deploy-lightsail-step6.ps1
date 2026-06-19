param(
    [string]$ServiceName = "oya-app",
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$jsonPath = Join-Path $root "lightsail\containers.generated.json"

if (-not (Test-Path $jsonPath)) {
    Write-Error "No existe $jsonPath. Ejecuta primero generate-lightsail-deployment.ps1"
}

$uri = "file://" + ($jsonPath -replace '\\', '/')
Write-Host "Desplegando con $uri ..."

aws lightsail create-container-service-deployment `
    --service-name $ServiceName `
    --cli-input-json $uri `
    --region $Region

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$url = aws lightsail get-container-services --service-name $ServiceName --region $Region `
    --query "containerServices[0].url" --output text 2>$null
if ($url) {
    Write-Host ""
    Write-Host "URL publica: $url"
    Write-Host "Actualiza CORS_ORIGINS en .env con esa URL y redeploy si el login falla."
}
