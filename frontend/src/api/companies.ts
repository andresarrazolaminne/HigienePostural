import { apiFetch, parseJson } from "./http"
import type { Company } from "./types"

export async function listCompanies(): Promise<Company[]> {
  const res = await apiFetch("/companies")
  return parseJson<Company[]>(res)
}

export async function createCompany(name: string): Promise<Company> {
  const res = await apiFetch("/companies", { method: "POST", body: JSON.stringify({ name }) })
  return parseJson<Company>(res)
}

export async function updateCompany(id: number, name: string): Promise<Company> {
  const res = await apiFetch(`/companies/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  })
  return parseJson<Company>(res)
}

export async function deleteCompany(id: number): Promise<void> {
  const res = await apiFetch(`/companies/${id}`, { method: "DELETE" })
  if (!res.ok) {
    await parseJson(res)
  }
}
