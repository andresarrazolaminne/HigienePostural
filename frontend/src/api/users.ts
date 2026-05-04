import { apiFetch, parseJson } from "./http"
import type { User, UserRole } from "./types"

export async function listUsers(): Promise<User[]> {
  const res = await apiFetch("/users")
  return parseJson<User[]>(res)
}

export async function createUser(payload: {
  name: string
  email: string
  password: string
  role: UserRole
  company_id?: number | null
}): Promise<User> {
  const res = await apiFetch("/users", { method: "POST", body: JSON.stringify(payload) })
  return parseJson<User>(res)
}

export async function updateUser(
  id: number,
  payload: Partial<{ name: string; email: string; password: string; role: UserRole; company_id: number | null }>,
): Promise<User> {
  const res = await apiFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) })
  return parseJson<User>(res)
}

export async function deleteUser(id: number): Promise<void> {
  const res = await apiFetch(`/users/${id}`, { method: "DELETE" })
  if (!res.ok) {
    await parseJson(res)
  }
}
