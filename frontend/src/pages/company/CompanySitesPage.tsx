import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../auth/useAuth"
import * as sitesApi from "../../api/sites"
import { PageHeader } from "../../components/ui/PageHeader"
import { Panel } from "../../components/ui/Panel"
import { EmptyState } from "../../components/ui/EmptyState"
import type { Site } from "../../api/types"

export function CompanySitesPage() {
  const { user } = useAuth()
  const [sites, setSites] = useState<Site[]>([])
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    setSites(await sitesApi.listSites())
  }

  useEffect(() => {
    void reload().catch((e) => setError(String(e)))
  }, [])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!user?.company_id) {
      return
    }
    setError(null)
    try {
      await sitesApi.createSite({
        company_id: user.company_id,
        name: name.trim(),
        address: address.trim() || null,
      })
      setName("")
      setAddress("")
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    }
  }

  async function onDelete(s: Site) {
    if (!window.confirm(`¿Eliminar sede «${s.name}»?`)) {
      return
    }
    setError(null)
    try {
      await sitesApi.deleteSite(s.id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    }
  }

  return (
    <div className="page-pad">
      <PageHeader
        kicker="Operaciones"
        title="Sedes"
        lead="Los inspectores eligen una sede para iniciar su inspección y registrar sesiones."
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <Panel title="Nueva sede" subtitle="Añade ubicaciones donde tu equipo realiza evaluaciones.">
        <form className="grid-form" onSubmit={onCreate}>
          <label>
            Nombre
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ej. Oficinas norte" />
          </label>
          <label>
            Ubicación (opcional)
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dirección o piso" />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn primary">
              Crear sede
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Sedes activas" subtitle={`${sites.length} sede${sites.length === 1 ? "" : "s"}`}>
        {sites.length === 0 ? (
          <EmptyState
            icon="📍"
            title="Sin sedes todavía"
            message="Crea la primera sede para que los inspectores puedan evaluar puestos de trabajo."
          />
        ) : (
          <ul className="card-list">
            {sites.map((s) => (
              <li key={s.id} className="card-list-item">
                <div>
                  <strong>{s.name}</strong>
                  {s.address && <p className="muted small">{s.address}</p>}
                </div>
                <div className="row-actions wrap">
                  <Link to={`/empresa/sedes/${s.id}/informe`} className="btn primary sm">
                    Ver informe
                  </Link>
                  <button type="button" className="btn danger sm" onClick={() => void onDelete(s)}>
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
