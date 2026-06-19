# Base de datos MySQL

## Formato de `DATABASE_URL`

```
mysql+pymysql://USUARIO:CONTRASEÑA_URL_ENCODED@HOST:3306/NOMBRE_BD
```

Si la contraseña tiene caracteres especiales (`;`, `&`, `(`, `)`, etc.), codifícala:

```powershell
python -c "from urllib.parse import quote_plus; print(quote_plus('tu-contraseña'))"
```

Pega el resultado en la URL en lugar de la contraseña en claro.

## Configurar `.env` local

Guarda `.env` en **UTF-8 sin BOM**. Si `DATABASE_URL` no se lee y la app usa SQLite, en PowerShell:

```powershell
$content = Get-Content .env -Raw
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$PWD\.env", $content.TrimStart([char]0xFEFF), $utf8)
```

O usa `.\scripts\configure-mysql-env.ps1` (escribe sin BOM).

En la raíz del proyecto (archivo `.env`, no se sube a git):

```env
DATABASE_URL=mysql+pymysql://...
ENVIRONMENT=production
```

## Migraciones

Con `.env` apuntando a MySQL:

```powershell
pip install -r requirements.txt
alembic upgrade head
```

Base de datos vacía: crea todas las tablas. Si ya existían tablas de SQLite, usa una BD MySQL nueva.

## Semilla demo (opcional)

```powershell
python scripts/seed_demo.py
```

## Lightsail

1. Pon `DATABASE_URL` en `.env` con la URL MySQL.
2. El servidor MySQL debe aceptar conexiones desde la IP del contenedor Lightsail (firewall / `bind-address` / usuario `@'%'`).
3. Vuelve a desplegar: `.\deploy-lightsail.bat`

`scripts/generate-lightsail-deployment.ps1` lee `DATABASE_URL` de `.env` y la envía al contenedor.

## Docker local

`docker-compose.yml` usa `env_file: .env`. Quita el override de SQLite y define `DATABASE_URL` en `.env`.

## Seguridad

- No commitees `.env` ni contraseñas en el repositorio.
- Rota la contraseña si se expuso en un chat o ticket.
- Restringe el acceso al puerto 3306 solo a IPs de confianza.
