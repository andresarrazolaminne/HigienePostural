# Despliegue local con Docker (depurar antes de Lightsail)

Replica el stack de producción: contenedor **web** (nginx + React) y **api** (FastAPI). El navegador usa un solo origen: `http://localhost:9080` (puerto por defecto; configurable con `WEB_PORT` en `.env`).

## Requisitos

- Docker Desktop en ejecución
- Archivo `.env` en la raíz (copia de `.env.example`)

### `.env` mínimo para Docker

```env
SECRET_KEY=tu-secreto-jwt-aleatorio-largo
OPENAI_API_KEY=sk-proj-...   # opcional; solo para fotos con IA
```

`SECRET_KEY` **no** debe ser la clave de OpenAI ni empezar por `sk-`.

## Arrancar

```powershell
cd E:\Proyectos\HigienePostural
.\docker-local.bat rebuild   # primera vez o tras cambios en código
```

Pruebas automáticas (con contenedores en marcha):

```powershell
.\docker-local.bat test
```

O:

```powershell
.\scripts\docker-local.ps1
```

- **App:** http://localhost:9080 (o el `WEB_PORT` de tu `.env`)  
- **API directa (debug):** http://localhost:9081/health  

Si el puerto 8080 ya lo usa otro programa (Vite, otro Docker, etc.), el compose usa **9080** por defecto. Para usar 8080: `WEB_PORT=8080` en `.env` y para ese puerto en `CORS_ORIGINS` el compose ya lo ajusta solo.

## Comandos útiles

| Acción | Comando |
|--------|---------|
| Ver logs | `.\docker-local.bat logs` o `docker compose logs -f` |
| Solo API | `docker compose logs -f api` |
| Solo web | `docker compose logs -f web` |
| Parar | `.\docker-local.bat down` |
| Rebuild limpio | `.\docker-local.bat rebuild` |
| Resembrar usuarios demo | `.\scripts\docker-local.ps1 -Action seed` |

## Usuarios demo

Con `RUN_SEED=1` (por defecto en compose), al arrancar la API crea:

| Rol | Email | Contraseña |
|-----|--------|------------|
| Super admin | admin@admin.co | admin123 |
| Admin empresa | empresa@demo.co | empresa123 |
| Inspector | inspector@demo.co | inspector123 |

Para no sembrar: en `.env` pon `RUN_SEED=0` o `docker compose up` con `-e RUN_SEED=0`.

## Depurar fallos típicos (los mismos que en Lightsail)

1. **Web no arranca / nginx y api**  
   `docker compose logs web` — debe aparecer `API disponible tras Xs`. Si no, revisa `docker compose logs api`.

2. **API no arranca**  
   `docker compose logs api` — migraciones Alembic, `SECRET_KEY` en producción, etc.

3. **Login / CORS**  
   El compose fija `CORS_ORIGINS` al mismo puerto que `WEB_PORT`. Abre la app por ese puerto (p. ej. **9080**), no por 9081.

4. **Base de datos**  
   Datos en volumen Docker `hp_data`. Borrar y empezar de cero:  
   `docker compose down -v`

## Comparar con Lightsail

| Local | Lightsail |
|-------|-----------|
| http://localhost:9080 | URL pública del servicio |
| `docker compose logs` | Show details → logs por contenedor |
| Puerto 8081 → API | Solo interno entre contenedores |

Cuando funcione en local, vuelve a `.\deploy-lightsail.bat`.
