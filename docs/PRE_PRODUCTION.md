# Checklist antes de producción

## 1. Tests automáticos (obligatorio)

```powershell
.\scripts\run-tests.ps1
```

Debe terminar con **29 passed** (aislamiento por empresa, auth, expertos).

## 2. Variables de entorno

- [ ] `SECRET_KEY` larga y aleatoria (no la de demo)
- [ ] `DATABASE_URL` MySQL con contraseña codificada en URL
- [ ] `ENVIRONMENT=production`
- [ ] `CORS_ORIGINS` solo dominios reales del front
- [ ] `OPENAI_API_KEY` solo en servidor
- [ ] S3 configurado si `STORAGE_BACKEND=s3`

## 3. Base de datos

- [ ] `alembic upgrade head` en el entorno de producción
- [ ] Firewall MySQL: solo IPs del servidor de aplicación
- [ ] Sin usuarios demo (`seed_demo` no ejecutado en prod)

## 4. Despliegue

- [ ] Imagen Docker reconstruida tras últimos cambios
- [ ] Nginx incluye ruta `/reports` en proxy API
- [ ] HTTPS delante de la app

## 5. Seguridad operativa

- Ver [SECURITY.md](SECURITY.md) y [TENANCY.md](TENANCY.md)
- Rotar credenciales si se expusieron en chat o tickets
