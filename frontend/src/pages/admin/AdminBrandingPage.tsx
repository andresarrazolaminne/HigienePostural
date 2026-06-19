import { useEffect, useState, type FormEvent } from "react"
import { PageHeader } from "../../components/ui/PageHeader"
import { Panel } from "../../components/ui/Panel"
import * as brandingApi from "../../api/branding"
import { brandingLogoSrc } from "../../api/branding"
import { formatFetchError } from "../../api/http"
import { useBranding } from "../../branding/BrandingProvider"
import { AppLogo } from "../../components/AppLogo"

export function AdminBrandingPage() {
  const { branding, applyBranding } = useBranding()
  const [appName, setAppName] = useState(branding.app_name)
  const [appTagline, setAppTagline] = useState(branding.app_tagline)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAppName(branding.app_name)
    setAppTagline(branding.app_tagline)
  }, [branding.app_name, branding.app_tagline])

  async function onSaveText(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const next = await brandingApi.updateBranding({
        app_name: appName.trim(),
        app_tagline: appTagline.trim(),
      })
      applyBranding(next)
      setMessage("Nombre y subtítulo actualizados.")
    } catch (err) {
      setError(formatFetchError(err))
    } finally {
      setBusy(false)
    }
  }

  async function onPickLogo(file: File | null) {
    if (!file) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const next = await brandingApi.uploadBrandingLogo(file)
      applyBranding(next)
      setMessage("Logo subido correctamente.")
    } catch (err) {
      setError(formatFetchError(err))
    } finally {
      setBusy(false)
    }
  }

  async function onRemoveLogo() {
    if (!window.confirm("¿Quitar el logo personalizado?")) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const next = await brandingApi.deleteBrandingLogo()
      applyBranding(next)
      setMessage("Logo eliminado.")
    } catch (err) {
      setError(formatFetchError(err))
    } finally {
      setBusy(false)
    }
  }

  const previewSrc = brandingLogoSrc(branding.logo_url)

  return (
    <div className="page-pad">
      <PageHeader
        title="Marca de la app"
        lead="Personaliza el nombre, subtítulo y logo que ven todos los usuarios al iniciar sesión."
      />

      <div className="admin-branding-grid">
        <Panel title="Vista previa" subtitle="Así se verá en el login">
          <div className="admin-branding-preview">
            <AppLogo size="xl" showName />
          </div>
        </Panel>

        <Panel title="Logo" subtitle="PNG o JPEG, máximo 2 MB. Se guarda en el almacenamiento configurado (local o S3).">
          <div className="admin-branding-logo-row">
            {previewSrc ? (
              <img src={previewSrc} alt="Logo actual" className="admin-branding-logo-preview" />
            ) : (
              <div className="admin-branding-logo-empty muted">Sin logo personalizado</div>
            )}
            <div className="admin-branding-logo-actions">
              <label className="btn secondary sm">
                Subir logo
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  hidden
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    void onPickLogo(f)
                    e.target.value = ""
                  }}
                />
              </label>
              {previewSrc && (
                <button type="button" className="btn ghost sm" disabled={busy} onClick={() => void onRemoveLogo()}>
                  Quitar logo
                </button>
              )}
            </div>
          </div>
        </Panel>

        <Panel title="Textos" subtitle="Nombre y frase corta bajo el logo">
          <form className="admin-branding-form" onSubmit={onSaveText}>
            <label>
              Nombre de la app
              <input
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                maxLength={120}
                required
              />
            </label>
            <label>
              Subtítulo
              <input
                value={appTagline}
                onChange={(e) => setAppTagline(e.target.value)}
                maxLength={200}
                required
              />
            </label>
            <button type="submit" className="btn primary" disabled={busy}>
              Guardar textos
            </button>
          </form>
        </Panel>
      </div>

      {message && <p className="form-success" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  )
}
