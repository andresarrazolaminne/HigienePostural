@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "SERVICE_NAME=oya-app"
set "AWS_REGION=us-east-1"
if not "%~1"=="" set "AWS_REGION=%~1"
set "DEPLOY_JSON=lightsail\containers.generated.json"
set "PATH=%~dp0;%PATH%"

echo.
echo ============================================================
echo  Higiene Postural - Despliegue Lightsail (contenedor unico)
echo  Servicio: %SERVICE_NAME%   Region: %AWS_REGION%
echo ============================================================
echo.

where aws >nul 2>&1
if errorlevel 1 (
    echo [ERROR] AWS CLI no encontrado. Ejecuta: aws configure
    exit /b 1
)

where docker >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker no encontrado. Inicia Docker Desktop.
    exit /b 1
)

if not exist "%~dp0lightsailctl.exe" (
    echo [ERROR] Falta lightsailctl.exe en la raiz del proyecto.
    exit /b 1
)

if not exist "%~dp0.env" (
    echo [ERROR] Falta .env en la raiz del proyecto.
    exit /b 1
)

echo [1/4] Generando %DEPLOY_JSON% desde .env ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\generate-lightsail-deployment.ps1" -ServiceName "%SERVICE_NAME%" -Region "%AWS_REGION%"
if errorlevel 1 (
    echo [ERROR] Revisa .env: SECRET_KEY, OPENAI_API_KEY, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, CORS_ORIGINS
    echo        O ejecuta: aws configure   ^(el script tambien lee esas credenciales^)
    exit /b 1
)

echo [2/4] Login en el registro de contenedores Lightsail...
aws lightsail create-container-service-registry-login --region %AWS_REGION%
if errorlevel 1 goto :fail

echo.
echo [3/4] Construyendo y subiendo imagen monolito (API + nginx)...
docker build -f Dockerfile.monolith --build-context frontend=./frontend -t hp-app:deploy .
if errorlevel 1 goto :fail
aws lightsail push-container-image --service-name %SERVICE_NAME% --label app --image hp-app:deploy --region %AWS_REGION%
if errorlevel 1 goto :fail

echo.
echo Esperando si hay un despliegue anterior en curso...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\wait-lightsail-deploy.ps1" -ServiceName "%SERVICE_NAME%" -Region "%AWS_REGION%"
if errorlevel 1 goto :fail

echo.
echo [4/4] Creando despliegue en %SERVICE_NAME% ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\deploy-lightsail-step6.ps1" -ServiceName "%SERVICE_NAME%" -Region "%AWS_REGION%"
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo  Despliegue enviado. Health check: /health
echo  Monta volumen /data en el contenedor app (SQLite).
echo ============================================================
echo.
goto :end

:fail
echo.
echo [ERROR] Fallo el despliegue. Lee el mensaje de error arriba.
exit /b 1

:end
endlocal
exit /b 0
