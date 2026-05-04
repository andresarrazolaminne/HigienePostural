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
