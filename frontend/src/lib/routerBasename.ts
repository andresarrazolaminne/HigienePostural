/** basename válido para BrowserRouter (Tauri/Capacitor usan ./; web/Docker usan /). */
export function getRouterBasename(): string | undefined {
  const raw = import.meta.env.BASE_URL
  if (!raw || raw === "/" || raw === "./") {
    return undefined
  }
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`
  const trimmed = withSlash.replace(/\/$/, "")
  return trimmed || undefined
}
