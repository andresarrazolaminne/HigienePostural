import { NavLink, Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../../auth/useAuth"

const linkCls = ({ isActive }: { isActive: boolean }) => (isActive ? "navlink active" : "navlink")

export function AdminLayout() {
  const { user, loading, logout } = useAuth()

  if (!loading && (!user || user.role !== "super_admin")) {
    return <Navigate to="/app" replace />
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
          <span className="muted small">Administración</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/admin/usuarios" className={linkCls}>
            Usuarios
          </NavLink>
          <NavLink to="/admin/empresas" className={linkCls}>
            Empresas
          </NavLink>
          <NavLink to="/admin/sedes" className={linkCls}>
            Sedes
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
