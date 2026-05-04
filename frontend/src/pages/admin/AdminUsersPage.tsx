import { useEffect, useState, type FormEvent } from "react"
import * as usersApi from "../../api/users"
import * as companiesApi from "../../api/companies"
import type { Company, User, UserRole } from "../../api/types"

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>("operator")
  const [companyId, setCompanyId] = useState<number | "">("")

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
      await usersApi.createUser({
        name,
        email,
        password,
        role,
        company_id: companyId === "" ? null : companyId,
      })
      setName("")
      setEmail("")
      setPassword("")
      setRole("operator")
      setCompanyId("")
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

  return (
    <div className="page-pad">
      <h2>Usuarios</h2>
      <p className="muted">Crea operadores y asígnales empresa para que gestionen sedes e informes.</p>
      {error && <p className="form-error">{error}</p>}

      <section className="panel">
        <h3>Nuevo usuario</h3>
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
              <option value="operator">Operador</option>
              <option value="super_admin">Super admin</option>
            </select>
          </label>
          <label>
            Empresa (operadores)
            <select
              value={companyId === "" ? "" : String(companyId)}
              onChange={(e) => setCompanyId(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">— Sin asignar —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button type="submit" className="btn primary">
              Crear usuario
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h3>Listado</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Empresa</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role === "super_admin" ? "Admin" : "Operador"}</td>
                  <td>
                    {u.role === "super_admin" ? (
                      "—"
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
                    <button type="button" className="btn danger sm" onClick={() => void onDelete(u)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
