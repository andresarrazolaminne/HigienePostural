import { NavLink, Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../../auth/useAuth"

const navCls = ({ isActive }: { isActive: boolean }) => (isActive ? "navlink active" : "navlink")

export function OperatorLayout() {
  const { user, loading, logout } = useAuth()

  if (!loading && user?.role === "super_admin") {
    return <Navigate to="/admin" replace />
  }

  if (!loading && (!user || user.role !== "operator")) {
    return <Navigate to="/login" replace />
  }

  if (loading || !user) {
    return (
      <div className="page-center muted">
        <p>Cargando…</p>
      </div>
    )
  }

  return (
    <div className="shell-app">
      <aside className="sidebar">
        <div className="brand">Higiene postural</div>
        <div className="sidebar-user">
          <strong>{user.name}</strong>
          <span className="muted small">Operador</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/app" end className={navCls}>
            Mis sedes
          </NavLink>
        </nav>
        <button type="button" className="btn ghost sidebar-logout" onClick={logout}>
          Cerrar sesión
        </button>
      </aside>
      <main className="main-area">
        <Outlet />
      </main>
    </div>
  )
}
