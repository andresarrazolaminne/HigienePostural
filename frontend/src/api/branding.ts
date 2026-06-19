import { apiFetch, parseJson, resolveApiUrl } from "./http"

export type Branding = {
  app_name: string
  app_tagline: string
  logo_url: string | null
}

export async function fetchBranding(): Promise<Branding> {
  const res = await apiFetch("/branding")
  return parseJson<Branding>(res)
}

export async function updateBranding(body: {
  app_name?: string
  app_tagline?: string
}): Promise<Branding> {
  const res = await apiFetch("/branding", {
    method: "PATCH",
    body: JSON.stringify(body),
  })
  return parseJson<Branding>(res)
}

export async function uploadBrandingLogo(file: File): Promise<Branding> {
  const form = new FormData()
  form.append("file", file)
  const res = await apiFetch("/branding/logo", { method: "POST", body: form })
  return parseJson<Branding>(res)
}

export async function deleteBrandingLogo(): Promise<Branding> {
  const res = await apiFetch("/branding/logo", { method: "DELETE" })
  return parseJson<Branding>(res)
}

export function brandingLogoSrc(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null
  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
    return logoUrl
  }
  return resolveApiUrl(logoUrl)
}
