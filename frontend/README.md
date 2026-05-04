# Cliente web / móvil / escritorio

Stack: **Vite + React + TypeScript**, **Capacitor** (Android/iOS) y **Tauri** (Windows/macOS/Linux).

## Requisitos

- **Node.js** 20+ (recomendado LTS).
- **Backend** FastAPI en marcha (por defecto `http://127.0.0.1:8080`) y CORS acorde.
- **Escritorio (Tauri build)**: [Rust](https://rustup.rs/) + herramientas del sistema que pida `tauri build`.
- **Móvil Android**: Android Studio + `npx cap add android` (una vez).

## Configuración

```bash
copy .env.example .env
```

Ajusta `VITE_API_URL` si tu API usa otro host o puerto. El backend debe incluir ese origen en `CORS_ORIGINS` (variable en `.env` del proyecto raíz).

## Interfaz web

- **Login** en `/login`. Usuario demo (tras `python scripts/seed_demo.py` en la raíz del repo): **admin@admin.co** / **admin123**.
- **Administrador** (`super_admin`): panel `/admin` — usuarios, empresas y sedes.
- **Operador** (`operator`): panel `/app` — sedes de su empresa, fotos por sede e informes.

Configura `VITE_API_URL` en `.env` para que apunte al mismo host/puerto que la API (CORS en el backend).

## Comandos

| Comando | Uso |
|--------|-----|
| `npm install` | Dependencias |
| `npm run dev` | Solo web (Vite, http://localhost:5173) |
| `npm run build` | Compila a `dist/` |
| `npm run tauri:dev` | Ventana de escritorio + hot reload (levanta Vite) |
| `npm run tauri:build` | Instalador/ejecutable de escritorio |
| `npm run cap:sync` | `build` + copia web a proyectos nativos |
| `npm run cap:add:android` | Añade carpeta `android/` (requiere SDK) |
| `npm run cap:add:ios` | Añade carpeta `ios/` (solo en macOS) |

Tras `cap:add:android`, abre el proyecto con Android Studio o `npx cap open android`.

## Icono de la app

Se generó un icono placeholder desde `app-icon.png` (puedes sustituirlo por un PNG cuadrado ≥ 1024px y ejecutar `npx tauri icon tu.png`).
