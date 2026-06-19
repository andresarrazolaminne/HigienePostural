import { API_BASE_URL } from "../config"

export const TOKEN_KEY = "hp_token"

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 400

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError"
}

function isRetryableNetworkError(err: unknown): boolean {
  if (isAbortError(err)) return false
  if (err instanceof TypeError) return true
  if (err instanceof Error && /failed to fetch|network/i.test(err.message)) return true
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Cursor/Electron blocks some exact API paths (/auth/me, /sites/mine, .../image).
 * A query string bypasses the block without affecting the backend.
 */
export function resolveApiUrl(path: string): string {
  if (path.startsWith("http")) return path
  const url = `${API_BASE_URL}${path}`
  return path.includes("?") ? `${url}&_=1` : `${url}?_=1`
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers = new Headers(init.headers)
  if (
    !headers.has("Content-Type") &&
    init.body != null &&
    !(init.body instanceof FormData) &&
    !(init.body instanceof URLSearchParams)
  ) {
    headers.set("Content-Type", "application/json")
  }
  if (token) headers.set("Authorization", `Bearer ${token}`)
  const url = resolveApiUrl(path)
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { ...init, headers })
      if ((res.status === 503 || res.status === 502) && attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1))
        continue
      }
      return res
    } catch (err) {
      lastError = err
      if (isRetryableNetworkError(err) && attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1))
        continue
      }
      throw err
    }
  }
  throw lastError
}

export function formatFetchError(err: unknown): string {
  if (isAbortError(err)) return ""
  if (err instanceof TypeError || (err instanceof Error && /failed to fetch/i.test(err.message))) {
    return API_BASE_URL === ""
      ? "No se pudo conectar con el servidor. Comprueba que Docker este en marcha (http://localhost:9080) e intentalo de nuevo."
      : `No se pudo conectar con ${API_BASE_URL}. Revisa VITE_API_URL.`
  }
  return err instanceof Error ? err.message : String(err)
}

export async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!res.ok) {
    let detail = text
    try {
      const j = JSON.parse(text) as { detail?: string | unknown }
      if (typeof j.detail === "string") detail = j.detail
      else if (Array.isArray(j.detail)) detail = JSON.stringify(j.detail)
    } catch {
      /* ignore */
    }
    const trimmed = (detail || "").trim()
    if (/internal server error/i.test(trimmed) || res.status === 500) {
      throw new Error(
        "Error del servidor al procesar la foto. Si acabas de desplegar, revisa credenciales S3 y OpenAI en Lightsail.",
      )
    }
    throw new Error(trimmed || `HTTP ${res.status}`)
  }
  return text ? (JSON.parse(text) as T) : ({} as T)
}