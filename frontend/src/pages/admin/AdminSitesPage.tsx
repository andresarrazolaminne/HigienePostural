import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import * as companiesApi from "../../api/companies"
import * as sitesApi from "../../api/sites"
import { PageHeader } from "../../components/ui/PageHeader"
import { Panel } from "../../components/ui/Panel"
import type { Company, Site } from "../../api/types"

export function AdminSitesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [filterCo, setFilterCo] = useState<number | "">("")
  const [sites, setSites] = useState<Site[]>([])
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [companyId, setCompanyId] = useState<number | "">("")
  const [error, setError] = useState<string | null>(null)

  async function loadCompanies() {
    setCompanies(await companiesApi.listCompanies())
  }

  async function loadSites() {
    const list = await sitesApi.listSites(filterCo === "" ? undefined : filterCo)
    setSites(list)
  }

  useEffect(() => {
    void loadCompanies().catch((e) => setError(String(e)))
  }, [])

  useEffect(() => {
    void loadSites().catch((e) => setError(String(e)))
  }, [filterCo])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (companyId === "") {
      setError("Elige una empresa")
      return
    }
    setError(null)
    try {
      await sitesApi.createSite({
        company_id: companyId,
        name: name.trim(),
        address: address.trim() || null,
      })
      setName("")
      setAddress("")
      await loadSites()
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
      await loadSites()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    }
  }

  return (
    <div className="page-pad">
      <PageHeader
        kicker="Plataforma"
        title="Sedes"
        lead="Ubicaciones físicas donde los inspectores realizan evaluaciones ergonómicas."
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <Panel title="Filtro">
        <label className="inline-label">
          Empresa
          <select
            value={filterCo === "" ? "" : String(filterCo)}
            onChange={(e) => setFilterCo(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">Todas las empresas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </Panel>

      <Panel title="Nueva sede" subtitle="Asigna la sede a una empresa existente.">
        <form className="grid-form" onSubmit={onCreate}>
          <label>
            Empresa
            <select
              value={companyId === "" ? "" : String(companyId)}
              onChange={(e) => setCompanyId(e.target.value === "" ? "" : Number(e.target.value))}
              required
            >
              <option value="">— Selecciona —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nombre de la sede
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Dirección (opcional)
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn primary">
              Crear sede
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Listado" subtitle={`${sites.length} sede${sites.length === 1 ? "" : "s"}`}>
        <ul className="card-list">
          {sites.map((s) => (
            <li key={s.id} className="card-list-item">
              <div>
                <strong>{s.name}</strong>
                <div className="muted small">
                  Empresa id {s.company_id}
                  {s.address ? ` · ${s.address}` : ""}
                </div>
              </div>
              <div className="row-actions wrap">
                <Link to={`/admin/sedes/${s.id}/informe`} className="btn primary sm">
                  Ver informe
                </Link>
                <button type="button" className="btn danger sm" onClick={() => void onDelete(s)}>
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
