import { useEffect, useState, type FormEvent } from "react"
import * as companiesApi from "../../api/companies"
import { PageHeader } from "../../components/ui/PageHeader"
import { Panel } from "../../components/ui/Panel"
import type { Company } from "../../api/types"

export function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    setCompanies(await companiesApi.listCompanies())
  }

  useEffect(() => {
    void reload().catch((e) => setError(String(e)))
  }, [])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await companiesApi.createCompany(name.trim())
      setName("")
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    }
  }

  async function onRename(c: Company) {
    const n = window.prompt("Nuevo nombre", c.name)
    if (!n || !n.trim()) {
      return
    }
    setError(null)
    try {
      await companiesApi.updateCompany(c.id, n.trim())
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    }
  }

  async function onDelete(c: Company) {
    if (!window.confirm(`¿Eliminar empresa «${c.name}»? (sin sedes ni dependencias)`)) {
      return
    }
    setError(null)
    try {
      await companiesApi.deleteCompany(c.id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    }
  }

  return (
    <div className="page-pad">
      <PageHeader
        kicker="Plataforma"
        title="Empresas"
        lead="Organizaciones clientes. Las sedes y usuarios se vinculan a cada empresa."
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <Panel title="Nueva empresa" subtitle="Registra una organización para asignar sedes e inspectores.">
        <form className="inline-form" onSubmit={onCreate}>
          <input
            placeholder="Nombre de la empresa"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button type="submit" className="btn primary">
            Añadir
          </button>
        </form>
      </Panel>

      <Panel title="Listado" subtitle={`${companies.length} empresa${companies.length === 1 ? "" : "s"} registrada${companies.length === 1 ? "" : "s"}`}>
        <ul className="card-list">
          {companies.map((c) => (
            <li key={c.id} className="card-list-item">
              <div>
                <strong>{c.name}</strong>
                <span className="muted small"> · id {c.id}</span>
              </div>
              <div className="row-actions">
                <button type="button" className="btn secondary sm" onClick={() => void onRename(c)}>
                  Renombrar
                </button>
                <button type="button" className="btn danger sm" onClick={() => void onDelete(c)}>
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
