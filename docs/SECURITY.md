# Seguridad — Higiene Postural

## Resumen

La API usa **JWT Bearer**, contraseñas con **bcrypt**, autorización por **rol y empresa**, e imágenes servidas solo por `GET /assessments/{id}/image` con comprobación de permisos (no hay carpeta `uploads` pública).

## Controles implementados

| Área | Medida |
|------|--------|
| Autenticación | OAuth2 password flow → JWT HS256; usuario cargado desde BD en cada petición |
| Autorización | `super_admin` / `company_admin` / `expert` / `user` (inspector); aislamiento por empresa — ver [TENANCY.md](TENANCY.md) |
| Imágenes | Máx. 10 MB; magic bytes JPEG/PNG; ruta bajo `upload_dir` con `relative_to` anti path traversal |
| Sesiones | Subida solo a sesión propia y **abierta** (`end_time` nulo) |
| Secretos | `.env` en `.gitignore`; en `ENVIRONMENT=production` falla el arranque sin `SECRET_KEY` fuerte |
| Errores | En producción, errores genéricos en el pipeline de IA (sin stack al cliente) |
| API | Sin exponer `image_path` interno en JSON; cabeceras `X-Content-Type-Options`, `X-Frame-Options`, etc. |

## Antes de producción

1. **`SECRET_KEY`**: generar con `openssl rand -hex 32` y poner en `.env`.
2. **`ENVIRONMENT=production`** en el servidor.
3. **`CORS_ORIGINS`**: solo dominios reales del front (no `http://localhost` amplios).
4. **HTTPS** delante de la API y del front.
5. **`OPENAI_API_KEY`**: solo en servidor, nunca en el front.
6. **Base de datos**: preferir PostgreSQL con backups; SQLite solo para desarrollo.
7. **Rate limiting** en `/auth/login` (recomendado: nginx, Cloudflare o slowapi).
8. **Token en front**: hoy está en `localStorage` (riesgo si hay XSS). Valorar cookies `HttpOnly` + `Secure` en un despliegue futuro.

## Cuentas demo

No usar `scripts/seed_demo.py` en producción. Rotar o eliminar usuarios de prueba.

## Revisión de permisos por recurso

Detalle completo en [TENANCY.md](TENANCY.md).

- **Empresas (CRUD global)**: solo `super_admin`.
- **Usuarios**: admin de empresa ve miembros de su empresa y expertos **asignados** a esa empresa (no todos los expertos de la plataforma).
- **Asignaciones experto**: admin empresa solo añade/quita su empresa; no sobrescribe asignaciones a otras empresas.
- **Sedes**: filtradas por empresa (o por asignaciones si es experto).
- **Sesiones / informes**: inspector solo los suyos y sedes de su empresa; admin y experto acotados por empresa.
- **Eliminar sesión**: inspector (propia), admin de empresa (de su empresa), super admin.
