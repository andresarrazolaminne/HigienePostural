@echo off
setlocal EnableExtensions
cd /d "%~dp0"

if not exist ".env" (
    echo [ERROR] Falta .env. Copia .env.example y configura SECRET_KEY ^(no uses la clave de OpenAI^).
    exit /b 1
)

if /i "%~1"=="down" (
    docker compose down %*
    exit /b 0
)

if /i "%~1"=="logs" (
    docker compose logs -f %*
    exit /b 0
)

if /i "%~1"=="test" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\docker-smoke-test.ps1"
    exit /b %ERRORLEVEL%
)

if /i "%~1"=="rebuild" (
    docker compose down
    docker compose up --build
    exit /b 0
)

echo.
echo ============================================================
echo  Docker local (mismo stack que Lightsail)
if not defined WEB_PORT set "WEB_PORT=9080"
echo  App:  http://localhost:%WEB_PORT%
echo  API:  http://localhost:9081/health
echo  (Puerto distinto de 8080: define WEB_PORT en .env si 9080 esta ocupado)
echo  Logs: docker-local.bat logs
echo  Parar: docker-local.bat down
echo ============================================================
echo.

docker compose up --build
