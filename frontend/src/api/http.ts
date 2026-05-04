import { API_BASE_URL } from "../config"

export const TOKEN_KEY = "hp_token"

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
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`
  return fetch(url, { ...init, headers })
}

export async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!res.ok) {
    let detail = text
    try {
      const j = JSON.parse(text) as { detail?: string | unknown }
      if (typeof j.detail === "string") {
        detail = j.detail
      } else if (Array.isArray(j.detail)) {
        detail = JSON.stringify(j.detail)
      }
    } catch {
      /* ignore */
    }
    throw new Error(detail || `HTTP ${res.status}`)
  }
  return text ? (JSON.parse(text) as T) : ({} as T)
}
