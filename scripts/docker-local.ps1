param(
    [ValidateSet("up", "down", "logs", "rebuild", "seed", "status")]
    [string]$Action = "up"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path (Join-Path $root ".env"))) {
    Write-Error "Falta .env. Copia .env.example y define SECRET_KEY (distinto de OPENAI_API_KEY)."
}

function Show-Status {
    docker compose ps
    Write-Host ""
    $wp = if ($env:WEB_PORT) { $env:WEB_PORT } else { "9080" }
    Write-Host "App:  http://localhost:$wp"
    Write-Host "API:  http://localhost:9081/health"
    try {
        $h = Invoke-WebRequest -Uri "http://localhost:8081/health" -UseBasicParsing -TimeoutSec 3
        Write-Host "Health: $($h.StatusCode) $($h.Content)"
    } catch {
        Write-Host "Health: API no responde aun ($($_.Exception.Message))"
    }
}

switch ($Action) {
    "up" {
        Write-Host "Levantando stack (build si hace falta)..."
        docker compose up --build
    }
    "down" { docker compose down }
    "logs" { docker compose logs -f }
    "rebuild" {
        docker compose down
        docker compose up --build
    }
    "seed" {
        docker compose exec api python scripts/seed_demo.py
    }
    "status" { Show-Status }
}
