import { apiFetch, parseJson } from "./http"
import type { SiteReport } from "./types"

export async function getSiteReport(siteId: number): Promise<SiteReport> {
  const res = await apiFetch(`/reports/sites/${siteId}`)
  return parseJson<SiteReport>(res)
}
