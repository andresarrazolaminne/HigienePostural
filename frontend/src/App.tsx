import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom"
import { AuthProvider } from "./auth/AuthProvider"
import { useAuth } from "./auth/useAuth"
import { AdminCompaniesPage } from "./pages/admin/AdminCompaniesPage"
import { AdminLayout } from "./pages/admin/AdminLayout"
import { AdminSitesPage } from "./pages/admin/AdminSitesPage"
import { AdminUsersPage } from "./pages/admin/AdminUsersPage"
import { LoginPage } from "./pages/LoginPage"
import { OperatorHome } from "./pages/operator/OperatorHome"
import { OperatorLayout } from "./pages/operator/OperatorLayout"
import { SiteWorkspace } from "./pages/operator/SiteWorkspace"
import "./ui.css"

function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="page-center muted">
        <p>Cargando…</p>
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

function RoleHome() {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <Navigate to={user.role === "super_admin" ? "/admin" : "/app"} replace />
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route index element={<RoleHome />} />
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="usuarios" replace />} />
              <Route path="usuarios" element={<AdminUsersPage />} />
              <Route path="empresas" element={<AdminCompaniesPage />} />
              <Route path="sedes" element={<AdminSitesPage />} />
            </Route>
            <Route path="app" element={<OperatorLayout />}>
              <Route index element={<OperatorHome />} />
              <Route path="sede/:siteId" element={<SiteWorkspace />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
