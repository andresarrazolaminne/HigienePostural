import { apiFetch, parseJson } from "./http"
import type { Site } from "./types"

export async function listSitesMine(): Promise<Site[]> {
  const res = await apiFetch("/sites/mine")
  return parseJson<Site[]>(res)
}

export async function listSites(companyId?: number): Promise<Site[]> {
  const q = companyId != null ? `?company_id=${companyId}` : ""
  const res = await apiFetch(`/sites${q}`)
  return parseJson<Site[]>(res)
}

export async function createSite(payload: {
  company_id: number
  name: string
  address?: string | null
}): Promise<Site> {
  const res = await apiFetch("/sites", { method: "POST", body: JSON.stringify(payload) })
  return parseJson<Site>(res)
}

export async function updateSite(
  id: number,
  payload: { name?: string; address?: string | null },
): Promise<Site> {
  const res = await apiFetch(`/sites/${id}`, { method: "PATCH", body: JSON.stringify(payload) })
  return parseJson<Site>(res)
}

export async function deleteSite(id: number): Promise<void> {
  const res = await apiFetch(`/sites/${id}`, { method: "DELETE" })
  if (!res.ok) {
    await parseJson(res)
  }
}
