import { useEffect, useState, type FormEvent } from "react"

function ExpertCompaniesCell({
  userId,
  companies,
  initial,
}: {
  userId: number
  companies: Company[]
  initial: number[]
}) {
  const [selected, setSelected] = useState<number[]>(initial)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSelected(initial)
  }, [initial])

  async function save(ids: number[]) {
    setSaving(true)
    try {
      await usersApi.setExpertCompanies(userId, ids)
    } finally {
      setSaving(false)
    }
  }

  return (
    <select
      multiple
      size={3}
      disabled={saving}
      value={selected.map(String)}
      onChange={(e) => {
        const ids = Array.from(e.target.selectedOptions).map((o) => Number(o.value))
        setSelected(ids)
        void save(ids)
      }}
    >
      {companies.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  )
}
import * as usersApi from "../../api/users"
import * as companiesApi from "../../api/companies"
import { ROLE_LABELS } from "../../lib/roles"
import { PageHeader } from "../../components/ui/PageHeader"
import { Panel } from "../../components/ui/Panel"
import type { Company, User, UserRole } from "../../api/types"

const ALL_ROLES: UserRole[] = ["super_admin", "company_admin", "expert", "user"]

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>("user")
  const [companyId, setCompanyId] = useState<number | "">("")
  const [expertCompanyIds, setExpertCompanyIds] = useState<number[]>([])

  async function reload() {
    const [u, c] = await Promise.all([usersApi.listUsers(), companiesApi.listCompanies()])
    setUsers(u)
    setCompanies(c)
  }

  useEffect(() => {
    void reload().catch((e) => setError(String(e)))
  }, [])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const created = await usersApi.createUser({
        name,
        email,
        password,
        role,
        company_id: role === "expert" || role === "super_admin" ? null : companyId === "" ? null : companyId,
      })
      if (role === "expert" && expertCompanyIds.length) {
        await usersApi.setExpertCompanies(created.id, expertCompanyIds)
      }
      setName("")
      setEmail("")
      setPassword("")
      setRole("user")
      setCompanyId("")
      setExpertCompanyIds([])
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    }
  }

  async function onCompanyChange(u: User, cid: number | "") {
    setError(null)
    try {
      await usersApi.updateUser(u.id, { company_id: cid === "" ? null : cid })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    }
  }

  async function onDelete(u: User) {
    if (!window.confirm(`¿Eliminar a ${u.email}?`)) {
      return
    }
    setError(null)
    try {
      await usersApi.deleteUser(u.id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    }
  }

  async function onRegenPin(u: User) {
    if (!window.confirm(`¿Generar una nueva clave de ingreso para ${u.name}? La anterior dejará de funcionar.`)) {
      return
    }
    setError(null)
    try {
      const updated = await usersApi.regeneratePin(u.id)
      await reload()
      window.alert(`Nueva clave de ingreso de ${updated.name}: ${updated.access_pin}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    }
  }

  return (
    <div className="page-pad">
      <PageHeader
        kicker="Plataforma"
        title="Usuarios"
        lead="Gestiona super administradores, admins de empresa, expertos ergonómicos e inspectores."
      />
      {error && <p className="form-error" role="alert">{error}</p>}

      <Panel title="Nuevo usuario" subtitle="Super admin, admin de empresa o inspector.">
        <form className="grid-form" onSubmit={onCreate}>
          <label>
            Nombre
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Contraseña (mín. 8)
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </label>
          <label>
            Rol
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Empresa
            <select
              value={companyId === "" ? "" : String(companyId)}
              onChange={(e) => setCompanyId(e.target.value === "" ? "" : Number(e.target.value))}
              disabled={role === "super_admin" || role === "expert"}
            >
              <option value="">— Sin asignar —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {role === "expert" && (
            <label className="full-width">
              Empresas asignadas (multi)
              <select
                multiple
                size={Math.min(6, companies.length || 1)}
                value={expertCompanyIds.map(String)}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions).map((o) => Number(o.value))
                  setExpertCompanyIds(opts)
                }}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="form-actions">
            <button type="submit" className="btn primary">
              Crear usuario
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Listado" subtitle={`${users.length} usuario${users.length === 1 ? "" : "s"}`}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Empresa</th>
                <th>Clave de ingreso</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{ROLE_LABELS[u.role]}</td>
                  <td>
                    {u.role === "super_admin" || u.role === "expert" ? (
                      u.role === "expert" ? (
                        <ExpertCompaniesCell userId={u.id} companies={companies} initial={u.expert_company_ids ?? []} />
                      ) : (
                        "—"
                      )
                    ) : (
                      <select
                        value={u.company_id ?? ""}
                        onChange={(e) =>
                          void onCompanyChange(u, e.target.value === "" ? "" : Number(e.target.value))
                        }
                      >
                        <option value="">Sin empresa</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    <span className="access-pin-cell">
                      <code className="access-pin-code">{u.access_pin ?? "—"}</code>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => void onRegenPin(u)}
                        title="Generar nueva clave"
                      >
                        Regenerar
                      </button>
                    </span>
                  </td>
                  <td>
                    <button type="button" className="btn danger sm" onClick={() => void onDelete(u)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
