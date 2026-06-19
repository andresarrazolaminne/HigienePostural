# Despliegue en AWS Lightsail (contenedores)

Arquitectura en Lightsail: **un solo contenedor** `app` (`Dockerfile.monolith`).

| Componente | Rol | Puerto |
|------------|-----|--------|
| nginx | SPA estática + proxy a la API | **80** (endpoint público) |
| uvicorn | FastAPI + migraciones Alembic | 127.0.0.1:8080 (solo dentro del contenedor) |

El front se construye con `VITE_API_URL` vacío: las peticiones van al mismo dominio (`/auth`, `/sessions`, …) y nginx las reenvía a `127.0.0.1:8080`. Así se evita el DNS entre contenedores `web`/`api`, que en Lightsail fallaba con `api could not be resolved`.

Para desarrollo local sigue existiendo `docker compose` con dos contenedores (`web` + `api`).

## Requisitos

- Cuenta AWS con Lightsail Container service
- [AWS CLI](https://aws.amazon.com/cli/) configurado
- Docker en tu máquina (para construir y subir imágenes)
- Dominio opcional (certificado HTTPS en Lightsail)

## 1. Probar en local

```bash
cp .env.example .env
# Edita SECRET_KEY (openssl rand -hex 32) y OPENAI_API_KEY

docker compose up --build
```

Abre http://localhost:8080 — login y API pasan por nginx.

Datos persistentes en el volumen Docker `hp_data` (SQLite + fotos).

## 2. Variables de entorno (producción)

Configúralas en la consola Lightsail → Contenedor `app` → Variables (no las subas al repo).

| Variable | Ejemplo | Notas |
|----------|---------|--------|
| `ENVIRONMENT` | `production` | Obligatorio |
| `SECRET_KEY` | *(64+ chars aleatorios)* | Obligatorio |
| `OPENAI_API_KEY` | `sk-...` | Obligatorio |
| `DATABASE_URL` | MySQL en `.env` (ver [DEPLOY_MYSQL.md](DEPLOY_MYSQL.md)) | Obligatorio en producción; SQLite solo local |
| `UPLOAD_DIR` | `/data/uploads` | Mismo volumen |
| `CORS_ORIGINS` | `https://tu-dominio.com` | URL pública del front |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Opcional |
| `STORAGE_BACKEND` | `s3` | Fotos en S3 (recomendado en prod) |
| `S3_BUCKET` | `fow-tod-data` | Bucket |
| `S3_PREFIX` | `OYA-APP` | Prefijo público en bucket policy |
| `S3_PUBLIC_BASE_URL` | `https://fow-tod-data.s3.us-east-1.amazonaws.com` | Base S3 (solo fallback; con presigned no se requiere bucket público) |
| `AWS_REGION` | `us-east-1` | Región del bucket |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | *(IAM con GetObject/PutObject/DeleteObject en OYA-APP/*)* | Contenedor `app` |

Las fotos en S3 se sirven mediante **URLs prefirmadas (presigned)**: el bucket puede (y debería) permanecer **privado**, sin bucket policy de lectura pública. Cada `image_url` es una URL temporal firmada (`S3_URL_EXPIRY_SECONDS`, por defecto 3600s). La base SQLite sigue en `/data` si montas volumen persistente.

**IAM mínimo** para el usuario de `AWS_ACCESS_KEY_ID` (el `s3:GetObject` es imprescindible para firmar las URLs de lectura):

```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket", "s3:GetBucketLocation"],
  "Resource": [
    "arn:aws:s3:::fow-tod-data",
    "arn:aws:s3:::fow-tod-data/OYA-APP/*"
  ]
}
```

Tras desplegar, abre `https://tu-url/health` y confirma `"storage_backend": "s3"`. En los logs del contenedor `app` debe aparecer `S3 accesible` o un error explícito al arranque.

### Fotos: errores frecuentes

| Síntoma | Causa habitual |
|---------|----------------|
| No hay objetos en S3 | `STORAGE_BACKEND=local` en `.env`, o faltan credenciales AWS en el despliegue |
| Imágenes rotas (403) que "se rompen al refrescar" | Se servían por URL pública con bucket privado. Ahora se usan URLs prefirmadas; requiere `s3:GetObject` en el IAM |
| Imágenes que desaparecen tras redeploy | `STORAGE_BACKEND=local` sobre disco efímero del contenedor. Usa `s3` o un volumen persistente en `/data` |
| `Internal Server Error` al subir | Fallo S3 no capturado (credenciales/IAM); tras el fix verás mensaje 503 claro |
| La foto no se analiza | `OPENAI_API_KEY` inválida o límite de API (503/502 con mensaje) |
| iPhone HEIC | El servidor convierte a JPEG; si falla, usa *Más compatible* en Ajustes > Cámara |

### PostgreSQL (recomendado si crece el uso)

Crea una base Lightsail Database (PostgreSQL) y usa:

```env
DATABASE_URL=postgresql+psycopg2://USER:PASS@HOST:5432/ergonomia
```

Instala dependencias ya incluidas (`psycopg2-binary`). No uses SQLite en producción con mucho tráfico.

### Almacenamiento persistente

En el despliegue Lightsail, monta un **disco persistente** en `/data` para el contenedor `app` (SQLite). Sin disco, cada redeploy pierde usuarios y sesiones. Las fotos con `STORAGE_BACKEND=s3` viven en S3, no en `/data`.

## 3. Crear el servicio de contenedores

Consola AWS → **Lightsail** → **Containers** → **Create container service**

- Potencia: Nano o Micro para pruebas; Small+ si hay muchas evaluaciones con IA
- Nombre: p. ej. `higiene-postural`

Anota el nombre del servicio: `SERVICE_NAME`.

## 4. Despliegue automatizado (Windows)

Con el servicio **`oya-app`** ya creado y `lightsailctl.exe` en la raíz del repo:

```bat
deploy-lightsail.bat
```

O con región explícita:

```bat
deploy-lightsail.bat us-east-1
```

El script: login al registro → build API y WEB → push con `aws lightsail push-container-image` → `create-container-service-deployment` usando `lightsail/containers.json`.

## 5. Construir y publicar imágenes (manual)

Desde la raíz del repo:

```bash
# PowerShell — ajusta SERVICE_NAME y región
$SERVICE = "higiene-postural"
$REGION = "us-east-1"

aws lightsail create-container-service-registry-login

# API
docker build -f Dockerfile.api -t hp-api:prod .
docker tag hp-api:prod ":${SERVICE}.api.latest"
docker push ":${SERVICE}.api.latest"

# Front (mismo origen, sin URL de API en el build)
docker build -f frontend/Dockerfile --build-arg VITE_API_URL= -t hp-web:prod ./frontend
docker tag hp-web:prod ":${SERVICE}.web.latest"
docker push ":${SERVICE}.web.latest"
```

En Windows, el tag con prefijo `:` es el formato del registro Lightsail; ver la documentación oficial de AWS sobre *pushing container images*.

## 5. Desplegar

1. Copia `lightsail/containers.json` y en la consola pega la definición de contenedores, **o**:

```bash
aws lightsail create-container-service-deployment `
  --service-name $SERVICE `
  --cli-input-json file://lightsail/containers.json
```

2. En la consola, añade **secretos** para `SECRET_KEY` y `OPENAI_API_KEY` (Lightsail → Deployment → Environment variables / secrets).

3. **Public endpoint**: contenedor `web`, puerto `80` (ya definido en `containers.json`).

4. Espera estado **Running** y abre la URL pública `https://xxxxx.us-east-1.cs.amazonlightsail.com/`.

## 6. HTTPS y dominio propio

Lightsail → Container service → **Custom domains** → crea certificado y asocia tu dominio.

Actualiza `CORS_ORIGINS` con `https://tudominio.com`.

## 7. Primera puesta en marcha

Tras el primer deploy, crea un admin (solo si no usas seed en prod):

```bash
# Ejecutar dentro del contenedor api (consola Lightsail → Execute command), o local:
docker compose exec api python scripts/create_admin.py
```

No ejecutes `seed_demo.py` en producción.

## 8. Actualizar versión

```bash
docker compose build   # prueba local
# Rebuild + push imágenes .latest
aws lightsail create-container-service-deployment --service-name $SERVICE --cli-input-json file://lightsail/containers.json
```

## Resumen de archivos Docker

| Archivo | Uso |
|---------|-----|
| `Dockerfile.api` | Backend FastAPI |
| `frontend/Dockerfile` | Build Vite + nginx |
| `frontend/nginx.conf` | SPA + reverse proxy |
| `docker-compose.yml` | Local |
| `lightsail/containers.json` | Plantilla de despliegue |

## Costes orientativos

- Container service Nano/Micro: desde ~7–10 USD/mes
- Disco persistente: según GB
- OpenAI: por uso (fuera de Lightsail)
- Base PostgreSQL Lightsail (opcional): plan aparte
