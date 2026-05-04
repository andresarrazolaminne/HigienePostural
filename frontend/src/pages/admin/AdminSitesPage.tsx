import { useEffect, useState, type FormEvent } from "react"
import * as companiesApi from "../../api/companies"
import * as sitesApi from "../../api/sites"
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
      <h2>Sedes</h2>
      <p className="muted">Cada sede pertenece a una empresa. Los operadores registran evaluaciones por sede.</p>
      {error && <p className="form-error">{error}</p>}

      <section className="panel">
        <h3>Filtro</h3>
        <label className="inline-label">
          Empresa
          <select
            value={filterCo === "" ? "" : String(filterCo)}
            onChange={(e) => setFilterCo(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">Todas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="panel">
        <h3>Nueva sede</h3>
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
            Nombre sede
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
      </section>

      <section className="panel">
        <h3>Listado</h3>
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
              <button type="button" className="btn danger sm" onClick={() => void onDelete(s)}>
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
