# Genera lightsail/containers.generated.json (un solo contenedor app para Lightsail).

param(

    [string]$EnvFile = "",

    [string]$ServiceName = "oya-app",

    [string]$Region = "us-east-1",

    [string]$OutFile = ""

)



$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

if (-not $EnvFile) { $EnvFile = Join-Path $root ".env" }

if (-not $OutFile) { $OutFile = Join-Path $root "lightsail\containers.generated.json" }



function Read-DotEnv([string]$path) {

    $map = @{}

    if (-not (Test-Path $path)) { return $map }

    Get-Content $path -Encoding UTF8 | ForEach-Object {

        $line = $_.Trim()

        if (-not $line -or $line.StartsWith("#")) { return }

        $idx = $line.IndexOf("=")

        if ($idx -lt 1) { return }

        $key = $line.Substring(0, $idx).Trim()

        $val = $line.Substring($idx + 1).Trim()

        if ($val.StartsWith('"') -and $val.EndsWith('"')) { $val = $val.Substring(1, $val.Length - 2) }

        $map[$key] = $val

    }

    return $map

}



function Env-OrDefault([hashtable]$map, [string]$key, [string]$default) {
    if ($null -eq $map) { return $default }
    if ($map.ContainsKey($key) -and $map[$key]) { return $map[$key] }
    return $default
}



function Resolve-ConfigValue([hashtable]$map, [string]$key) {

    if ($map.ContainsKey($key) -and $map[$key]) { return $map[$key] }

    $fromProcess = [Environment]::GetEnvironmentVariable($key, "Process")

    if ($fromProcess) { return $fromProcess }

    return $null

}



function Get-AwsCliConfig([string]$name) {

    if (-not (Get-Command aws -ErrorAction SilentlyContinue)) { return $null }

    $prev = $ErrorActionPreference

    $ErrorActionPreference = "SilentlyContinue"

    $v = (aws configure get $name 2>$null | Out-String).Trim()

    $ErrorActionPreference = $prev

    if (-not $v) { return $null }

    return $v

}



function Get-LightsailPublicUrl([string]$service, [string]$region) {

    if (-not (Get-Command aws -ErrorAction SilentlyContinue)) { return $null }

    $prev = $ErrorActionPreference

    $ErrorActionPreference = "SilentlyContinue"

    $url = (aws lightsail get-container-services --service-name $service --region $region --query "containerServices[0].url" --output text 2>$null | Out-String).Trim()

    $ErrorActionPreference = $prev

    if (-not $url -or $url -eq "None") { return $null }

    return $url.TrimEnd("/")

}



if (-not (Test-Path $EnvFile)) {

    Write-Error "No existe $EnvFile. Copia .env.example a .env y completa las variables de Lightsail."

}



$envVars = Read-DotEnv $EnvFile



# AWS: .env -> variables de entorno -> aws configure

$awsKey = Resolve-ConfigValue $envVars "AWS_ACCESS_KEY_ID"

$awsSecret = Resolve-ConfigValue $envVars "AWS_SECRET_ACCESS_KEY"

if (-not $awsKey) { $awsKey = Get-AwsCliConfig "aws_access_key_id" }

if (-not $awsSecret) { $awsSecret = Get-AwsCliConfig "aws_secret_access_key" }

if ($awsKey) { $envVars["AWS_ACCESS_KEY_ID"] = $awsKey }

if ($awsSecret) { $envVars["AWS_SECRET_ACCESS_KEY"] = $awsSecret }



$secretKey = $envVars["SECRET_KEY"]

$openaiKey = $envVars["OPENAI_API_KEY"]

if ($null -eq $openaiKey) { $openaiKey = "" }

$cors = $envVars["CORS_ORIGINS"]



if (-not $secretKey -or $secretKey -eq "change-me-to-a-long-random-string") {

    Write-Error "SECRET_KEY invalida o ausente en $EnvFile. Genera una con: openssl rand -hex 32"

}

if ($secretKey -match '^sk-' -or ($openaiKey -and $secretKey -eq $openaiKey)) {

    Write-Error "SECRET_KEY no debe ser la clave de OpenAI (sk-...). Usa un secreto aleatorio distinto para JWT."

}

if (-not $openaiKey) {

    Write-Warning "OPENAI_API_KEY vacia: la API arrancara pero las fotos con IA fallaran."

}



if (-not $cors) {

    $cors = Get-LightsailPublicUrl -service $ServiceName -region $Region

    if ($cors) {

        Write-Host "CORS_ORIGINS detectado desde Lightsail ($ServiceName): $cors"

    }

}

if (-not $cors) {

    Write-Warning @"

CORS_ORIGINS no definido. Anade en .env la URL publica de tu app, por ejemplo:

  CORS_ORIGINS=https://oya-app.xxxxx.us-east-1.cs.amazonlightsail.com

"@

    $cors = "https://localhost"

}



$storageBackend = Env-OrDefault $envVars "STORAGE_BACKEND" "s3"

$s3Bucket = Env-OrDefault $envVars "S3_BUCKET" "fow-tod-data"

$s3Prefix = Env-OrDefault $envVars "S3_PREFIX" "OYA-APP"

$s3PublicBase = Env-OrDefault $envVars "S3_PUBLIC_BASE_URL" "https://fow-tod-data.s3.us-east-1.amazonaws.com"

$awsRegion = Env-OrDefault $envVars "AWS_REGION" "us-east-1"



if ($storageBackend -eq "s3") {

    if (-not $envVars["AWS_ACCESS_KEY_ID"] -or -not $envVars["AWS_SECRET_ACCESS_KEY"]) {

        Write-Error @"

Faltan credenciales AWS para subir fotos a S3. Elige UNA opcion:



  A) En .env (recomendado para deploy-lightsail.bat):

     AWS_ACCESS_KEY_ID=AKIA...

     AWS_SECRET_ACCESS_KEY=...



  B) Ya configuraste 'aws configure' en esta PC (el script las leera automaticamente).



  C) Usuario IAM con permisos s3:PutObject, s3:GetObject y s3:DeleteObject en arn:aws:s3:::fow-tod-data/OYA-APP/*



Tambien en .env:

  STORAGE_BACKEND=s3

  CORS_ORIGINS=https://tu-url-lightsail.cs.amazonlightsail.com

"@

    }

    Write-Host "AWS credentials: OK"

}



$appEnvironment = @{

    ENVIRONMENT                 = "production"

    DATABASE_URL                = (Env-OrDefault $envVars "DATABASE_URL" "sqlite:////data/ergonomia.db")

    UPLOAD_DIR                  = "/data/uploads"

    JWT_ALGORITHM               = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES = "60"

    SECRET_KEY                  = $secretKey

    OPENAI_API_KEY              = $openaiKey

    CORS_ORIGINS                = $cors

    STORAGE_BACKEND             = $storageBackend

    S3_BUCKET                   = $s3Bucket

    S3_PREFIX                   = $s3Prefix

    S3_PUBLIC_BASE_URL          = $s3PublicBase

    AWS_REGION                  = $awsRegion

    RUN_SEED                    = "1"

}



if ($envVars["AWS_ACCESS_KEY_ID"]) { $appEnvironment["AWS_ACCESS_KEY_ID"] = $envVars["AWS_ACCESS_KEY_ID"] }

if ($envVars["AWS_SECRET_ACCESS_KEY"]) { $appEnvironment["AWS_SECRET_ACCESS_KEY"] = $envVars["AWS_SECRET_ACCESS_KEY"] }

if ($envVars["RUN_SEED"]) { $appEnvironment["RUN_SEED"] = $envVars["RUN_SEED"] }



$deployment = @{

    containers = @{

        app = @{

            image       = ":$ServiceName.app.latest"

            environment = $appEnvironment

            ports       = @{ "80" = "HTTP" }

        }

    }

    publicEndpoint = @{

        containerName = "app"

        containerPort = 80

        healthCheck   = @{

            path               = "/health"

            successCodes       = "200-499"

            intervalSeconds    = 10

            timeoutSeconds     = 5

            healthyThreshold   = 2

            unhealthyThreshold = 5

        }

    }

}



$json = $deployment | ConvertTo-Json -Depth 10

$dir = Split-Path -Parent $OutFile

if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

$utf8NoBom = New-Object System.Text.UTF8Encoding $false

[System.IO.File]::WriteAllText($OutFile, $json, $utf8NoBom)

$null = $json | ConvertFrom-Json

Write-Host "Generado: $OutFile (contenedor: app, CORS=$cors, storage=$storageBackend)"

