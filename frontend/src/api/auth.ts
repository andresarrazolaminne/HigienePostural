import { apiFetch, parseJson } from "./http"
import type { User } from "./types"

export async function loginRequest(email: string, password: string): Promise<{ access_token: string }> {
  const body = new URLSearchParams()
  body.set("username", email)
  body.set("password", password)
  const res = await apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  return parseJson<{ access_token: string }>(res)
}

export async function fetchMe(): Promise<User> {
  const res = await apiFetch("/auth/me")
  return parseJson<User>(res)
}
