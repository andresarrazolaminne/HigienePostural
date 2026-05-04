import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../auth/useAuth"
import * as sitesApi from "../../api/sites"
import type { Site } from "../../api/types"

export function OperatorHome() {
  const { user } = useAuth()
  const [sites, setSites] = useState<Site[]>([])
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    setSites(await sitesApi.listSitesMine())
  }

  useEffect(() => {
    void reload().catch((e) => setError(String(e)))
  }, [])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!user?.company_id) {
      setError("Tu cuenta no tiene empresa asignada.")
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

  if (!user?.company_id) {
    return (
      <div className="page-pad">
        <h2>Mis sedes</h2>
        <div className="notice">
          <p>
            Tu usuario aún no tiene una <strong>empresa</strong> asignada. Un administrador debe editarte en
            «Usuarios» y elegir la empresa correspondiente.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-pad">
      <h2>Mis sedes</h2>
      <p className="muted">Elige una sede para tomar fotos y ver informes, o crea una nueva.</p>
      {error && <p className="form-error">{error}</p>}

      <section className="panel">
        <h3>Nueva sede</h3>
        <form className="grid-form" onSubmit={onCreate}>
          <label>
            Nombre
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ej. Planta norte" />
          </label>
          <label>
            Ubicación (opcional)
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dirección o referencia" />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn primary">
              Crear sede
            </button>
          </div>
        </form>
      </section>

      <section className="site-grid">
        {sites.length === 0 && <p className="muted">Aún no hay sedes. Crea la primera arriba.</p>}
        {sites.map((s) => (
          <Link key={s.id} to={`/app/sede/${s.id}`} className="site-card">
            <h4>{s.name}</h4>
            {s.address && <p className="muted small">{s.address}</p>}
            <span className="site-card-cta">Abrir →</span>
          </Link>
        ))}
      </section>
    </div>
  )
}
