import { brandingLogoSrc } from "../api/branding"
import { useBranding, useBrandingMark } from "../branding/BrandingProvider"

type Props = {
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  showName?: boolean
}

export function AppLogo({ size = "md", className = "", showName = false }: Props) {
  const { branding, loading } = useBranding()
  const mark = useBrandingMark()
  const src = brandingLogoSrc(branding.logo_url)

  return (
    <div className={`app-logo-wrap app-logo-wrap-${size} ${className}`.trim()}>
      {loading ? (
        <span className="app-logo-fallback" aria-hidden />
      ) : src ? (
        <img src={src} alt="" className="app-logo-img" />
      ) : (
        <span className="app-logo-fallback" aria-hidden>
          {mark}
        </span>
      )}
      {showName && (
        <div className="app-logo-text">
          <strong>{branding.app_name}</strong>
          <span className="muted small">{branding.app_tagline}</span>
        </div>
      )}
    </div>
  )
}
