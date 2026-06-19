import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import * as brandingApi from "../api/branding"
import type { Branding } from "../api/branding"
import { APP_NAME, APP_TAGLINE } from "../config/branding"

type BrandingContextValue = {
  branding: Branding
  loading: boolean
  refresh: () => Promise<void>
  applyBranding: (next: Branding) => void
}

const defaultBranding: Branding = {
  app_name: APP_NAME,
  app_tagline: APP_TAGLINE,
  logo_url: null,
}

const BrandingContext = createContext<BrandingContextValue | null>(null)

function applyDocumentTitle(branding: Branding) {
  document.title = `${branding.app_name} — ${branding.app_tagline}`
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(defaultBranding)
  const [loading, setLoading] = useState(true)

  const applyBranding = useCallback((next: Branding) => {
    setBranding(next)
    applyDocumentTitle(next)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const data = await brandingApi.fetchBranding()
      applyBranding(data)
    } catch {
      applyDocumentTitle(defaultBranding)
    } finally {
      setLoading(false)
    }
  }, [applyBranding])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(
    () => ({ branding, loading, refresh, applyBranding }),
    [branding, loading, refresh, applyBranding],
  )

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}

export function useBranding(): BrandingContextValue {
  const ctx = useContext(BrandingContext)
  if (!ctx) {
    return {
      branding: defaultBranding,
      loading: false,
      refresh: async () => {},
      applyBranding: () => {},
    }
  }
  return ctx
}

export function useBrandingMark(): string {
  const { branding } = useBranding()
  return branding.app_name.trim().charAt(0).toUpperCase() || "H"
}
