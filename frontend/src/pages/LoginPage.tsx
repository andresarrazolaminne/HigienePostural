import { useState, type FormEvent } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { formatFetchError } from "../api/http"
import { useAuth } from "../auth/useAuth"
import { AppLogo } from "../components/AppLogo"
import { homePathForRole } from "../lib/roles"

const IS_DEV = import.meta.env.DEV

const DEMO_ACCOUNTS = [
  { role: "Inspector", email: "inspector@demo.co", password: "inspector123", pin: "111111" },
  { role: "Admin empresa", email: "empresa@demo.co", password: "empresa123", pin: "222222" },
  { role: "Super admin", email: "admin@admin.co", password: "admin123", pin: "999999" },
] as const

type Mode = "code" | "password"

export function LoginPage() {
  const { user, loading, login, loginWithCode } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>("code")
  const [code, setCode] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && user) {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

  async function runLogin(action: () => Promise<{ role: Parameters<typeof homePathForRole>[0] }>) {
    setError(null)
    setBusy(true)
    try {
      const u = await action()
      navigate(homePathForRole(u.role), { replace: true })
    } catch (err) {
      setError(formatFetchError(err) || "No se pudo iniciar sesión")
    } finally {
      setBusy(false)
    }
  }

  async function onSubmitCode(e: FormEvent) {
    e.preventDefault()
    await runLogin(() => loginWithCode(code.trim()))
  }

  async function onSubmitPassword(e: FormEvent) {
    e.preventDefault()
    await runLogin(() => login(email.trim(), password))
  }

  return (
    <div className="login-app">
      <div className="login-app-bg" aria-hidden />

      <main className="login-app-main">
        <header className="login-app-header">
          <AppLogo size="xl" showName className="login-app-logo" />
          <h1 className="login-app-greeting">¡Hola!</h1>
          <p className="login-app-lead">
            {mode === "code"
              ? "Ingresa tu clave de acceso para continuar"
              : "Ingresa con tu cuenta corporativa"}
          </p>
        </header>

        {mode === "code" ? (
          <form onSubmit={onSubmitCode} className="login-app-form">
            <label className="login-app-field">
              <span className="login-app-field-label">Clave de ingreso</span>
              <input
                className="login-code-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="● ● ● ● ● ●"
                aria-label="Clave de ingreso"
                required
              />
            </label>
            {error && (
              <p className="form-error login-app-error" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="btn primary btn-lg login-app-submit"
              disabled={busy || loading || code.length < 4}
            >
              {busy ? "Entrando…" : "Entrar"}
            </button>
            <button
              type="button"
              className="btn ghost login-mode-switch"
              onClick={() => {
                setMode("password")
                setError(null)
              }}
            >
              Entrar con correo y contraseña
            </button>
          </form>
        ) : (
          <form onSubmit={onSubmitPassword} className="login-app-form">
            <label className="login-app-field">
              <span className="login-app-field-label">Correo electrónico</span>
              <input
                type="email"
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.co"
                required
              />
            </label>
            <label className="login-app-field">
              <span className="login-app-field-label">Contraseña</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>
            {error && (
              <p className="form-error login-app-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn primary btn-lg login-app-submit" disabled={busy || loading}>
              {busy ? "Entrando…" : "Entrar"}
            </button>
            <button
              type="button"
              className="btn ghost login-mode-switch"
              onClick={() => {
                setMode("code")
                setError(null)
              }}
            >
              ← Entrar con clave de ingreso
            </button>
          </form>
        )}

        {IS_DEV && (
          <div className="login-demo login-app-demo">
            <p className="login-demo-title">Acceso rápido (desarrollo)</p>
            <div className="login-demo-buttons">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  className="btn secondary sm login-demo-btn"
                  disabled={busy}
                  onClick={() =>
                    void runLogin(() =>
                      mode === "code" ? loginWithCode(acc.pin) : login(acc.email, acc.password),
                    )
                  }
                >
                  {acc.role}
                  <span className="login-demo-pin">PIN {acc.pin}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
