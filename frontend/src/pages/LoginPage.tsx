import { useState, type FormEvent } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { useAuth } from "../auth/useAuth"

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("admin@admin.co")
  const [password, setPassword] = useState("admin123")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && user) {
    return <Navigate to={user.role === "super_admin" ? "/admin" : "/app"} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const u = await login(email.trim(), password)
      navigate(u.role === "super_admin" ? "/admin" : "/app", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Higiene postural</h1>
        <p className="login-lead">Inicia sesión para continuar</p>
        <form onSubmit={onSubmit} className="login-form">
          <label>
            Correo
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn primary" disabled={busy || loading}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="login-hint">Demo admin: admin@admin.co / admin123 (tras ejecutar scripts/seed_demo.py)</p>
      </div>
    </div>
  )
}
