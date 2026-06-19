import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom"
import { useCallback } from "react"
import { useAuth } from "../auth/useAuth"
import { AppLogo } from "./AppLogo"
import { useBranding } from "../branding/BrandingProvider"
import { ROLE_LABELS } from "../lib/roles"

export type NavItem = {
  to: string
  label: string
  end?: boolean
  icon?: string
}

type Props = {
  allowedRole: "super_admin" | "company_admin" | "expert" | "user"
  nav: NavItem[]
  areaLabel: string
}

const navCls = ({ isActive }: { isActive: boolean }) => (isActive ? "navlink active" : "navlink")

export function AppShell({ allowedRole, nav, areaLabel: _areaLabel }: Props) {
  const { user, loading, logout } = useAuth()
  const { branding } = useBranding()
  const navigate = useNavigate()

  const handleLogout = useCallback(() => {
    logout()
    navigate("/login", { replace: true })
  }, [logout, navigate])

  if (!loading && user && user.role !== allowedRole) {
    if (user.role === "super_admin") {
      return <Navigate to="/admin" replace />
    }
    if (user.role === "company_admin") {
      return <Navigate to="/empresa" replace />
    }
    if (user.role === "expert") {
      return <Navigate to="/experto" replace />
    }
    return <Navigate to="/app" replace />
  }

  if (loading || !user) {
    return (
      <div className="page-center">
        <div className="loading-block">
          <span className="loading-spinner" aria-hidden />
          <span className="muted">Cargando sesión…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="shell-app">
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="brand-block">
          <AppLogo size="sm" />
          <div>
            <div className="brand">{branding.app_name}</div>
            <span className="brand-tag muted small">{branding.app_tagline}</span>
          </div>
        </div>
        <div className="sidebar-user">
          <strong>{user.name}</strong>
          <span className="muted small">{ROLE_LABELS[user.role]}</span>
        </div>
        <nav className="sidebar-nav">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navCls}>
              {item.icon && (
                <span className="navlink-icon" aria-hidden>
                  {item.icon}
                </span>
              )}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" className="btn ghost sidebar-logout" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </aside>

      <nav className="mobile-nav" aria-label="Navegación móvil">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={navCls}>
            {item.icon && <span aria-hidden>{item.icon}</span>}
            <span className="mobile-nav-label">{item.label}</span>
          </NavLink>
        ))}
        <button type="button" className="mobile-nav-logout" onClick={handleLogout}>
          <span aria-hidden>🚪</span>
          <span className="mobile-nav-label">Salir</span>
        </button>
      </nav>

      <main className="main-area">
        <Outlet />
      </main>
    </div>
  )
}
