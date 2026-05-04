# Arranca la API FastAPI (uvicorn) desde la raíz del proyecto.
# Requisitos: Python 3.11+ en PATH. La clave OpenAI va en .env (no la pegues en este script).

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
Set-Location $Root

if (-not (Test-Path (Join-Path $Root "app\main.py"))) {
    Write-Error "Ejecuta este script desde la raíz del proyecto (donde está app\main.py)."
}

$venvPython = Join-Path $Root ".venv\Scripts\python.exe"
$venvUvicorn = Join-Path $Root ".venv\Scripts\uvicorn.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "Creando entorno virtual .venv..." -ForegroundColor Cyan
    python -m venv .venv
}

if (-not (Test-Path $venvUvicorn)) {
    Write-Host "Instalando dependencias..." -ForegroundColor Cyan
    & $venvPython -m pip install --upgrade pip | Out-Null
    & $venvPython -m pip install -r (Join-Path $Root "requirements.txt")
}

if (-not (Test-Path (Join-Path $Root ".env"))) {
    Write-Host ""
    Write-Host "Aviso: no existe .env. Copia .env.example a .env y define OPENAI_API_KEY (y SECRET_KEY en producción)." -ForegroundColor Yellow
    Write-Host ""
}

# Puerto 8000 a veces falla en Windows (WinError 10013) por rangos reservados (Hyper-V, Docker, etc.).
# Por defecto usamos 8080. Sobrescribe con: $env:PORT = 8765; .\run.ps1
$port = 8080
if ($env:PORT -and $env:PORT -match "^\d+$") {
    $port = [int]$env:PORT
}

# Evita códigos ANSI raros en consolas antiguas de Windows
$env:NO_COLOR = "1"

$base = "http://127.0.0.1:$port"
Write-Host "Servidor: $base  |  Docs: $base/docs" -ForegroundColor Green
Write-Host "(Si falla el puerto, prueba otro: `$env:PORT = 8765; .\run.ps1)" -ForegroundColor DarkGray
Write-Host "Front (Vite): cd frontend; npm install; npm run dev  (ver frontend\README.md)" -ForegroundColor DarkGray
& $venvUvicorn app.main:app --reload --host 127.0.0.1 --port $port
