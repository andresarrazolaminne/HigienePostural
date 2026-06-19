# Espera a que el servicio Lightsail no este en DEPLOYING (max ~20 min).
param(
    [string]$ServiceName = "oya-app",
    [string]$Region = "us-east-1",
    [int]$IntervalSeconds = 30,
    [int]$MaxWaitMinutes = 20
)

$ErrorActionPreference = "Stop"
$deadline = (Get-Date).AddMinutes($MaxWaitMinutes)

while ($true) {
    $state = aws lightsail get-container-services `
        --service-name $ServiceName `
        --region $Region `
        --query "containerServices[0].state" `
        --output text 2>$null

    if (-not $state) {
        Write-Warning "No se pudo leer el estado del servicio."
        exit 0
    }

    if ($state -ne "DEPLOYING") {
        Write-Host "Servicio en estado: $state (listo para nuevo despliegue)."
        exit 0
    }

    if ((Get-Date) -ge $deadline) {
        Write-Error "Timeout: el servicio sigue en DEPLOYING tras $MaxWaitMinutes min. Espera en la consola AWS y vuelve a ejecutar el paso 6."
    }

    Write-Host "Despliegue en curso (DEPLOYING). Esperando ${IntervalSeconds}s ..."
    Start-Sleep -Seconds $IntervalSeconds
}
