import { apiFetch, parseJson } from "./http"
import type { WorkSession } from "./types"

export async function listMySessions(siteId?: number): Promise<WorkSession[]> {
  const q = siteId != null ? `?site_id=${siteId}` : ""
  const res = await apiFetch(`/sessions/mine${q}`)
  return parseJson<WorkSession[]>(res)
}

export async function createSession(siteId: number): Promise<WorkSession> {
  const res = await apiFetch("/sessions", {
    method: "POST",
    body: JSON.stringify({ site_id: siteId }),
  })
  return parseJson<WorkSession>(res)
}

export async function endSession(sessionId: number): Promise<WorkSession> {
  const res = await apiFetch(`/sessions/${sessionId}/end`, {
    method: "PATCH",
    body: JSON.stringify({}),
  })
  return parseJson<WorkSession>(res)
}

export async function deleteSession(sessionId: number): Promise<void> {
  const res = await apiFetch(`/sessions/${sessionId}`, { method: "DELETE" })
  if (!res.ok) {
    await parseJson(res)
  }
}

export async function listCompanySessions(siteId?: number): Promise<WorkSession[]> {
  const q = siteId != null ? `?site_id=${siteId}` : ""
  const res = await apiFetch(`/sessions/company${q}`)
  return parseJson<WorkSession[]>(res)
}
