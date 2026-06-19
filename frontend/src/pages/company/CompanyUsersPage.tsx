import { useEffect, useState, type FormEvent } from "react"
import { useAuth } from "../../auth/useAuth"
import * as usersApi from "../../api/users"
import { PageHeader } from "../../components/ui/PageHeader"
import { Panel } from "../../components/ui/Panel"
import type { User, UserRole } from "../../api/types"
import { ROLE_LABELS } from "../../lib/roles"

export function CompanyUsersPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>("user")

  async function reload() {
    setUsers(await usersApi.listUsers())
  }

  useEffect(() => {
    void reload().catch((e) => setError(String(e)))
  }, [])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!me?.company_id) {
      return
    }
    setError(null)
    try {
      await usersApi.createUser({
        name,
        email,
        password,
        role,
        company_id: me.company_id,
      })
      setName("")
      setEmail("")
      setPassword("")
      setRole("user")
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
        kicker="Equipo"
        title="Usuarios"
        lead="Crea inspectores y administradores de tu organización."
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <Panel title="Nuevo usuario" subtitle="Los inspectores capturan fotos y generan informes en sede.">
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <label>
            Rol
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="user">Inspector</option>
              <option value="company_admin">Administrador de empresa</option>
              <option value="expert">Experto ergonómico</option>
            </select>
          </label>
          <div className="form-actions">
            <button type="submit" className="btn primary">
              Crear usuario
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Equipo" subtitle={`${users.length} miembro${users.length === 1 ? "" : "s"}`}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
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
                    {u.id !== me?.id && (
                      <button type="button" className="btn danger sm" onClick={() => void onDelete(u)}>
                        Eliminar
                      </button>
                    )}
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
