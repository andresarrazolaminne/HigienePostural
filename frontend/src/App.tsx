import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom"
import { getRouterBasename } from "./lib/routerBasename"
import { BrandingProvider } from "./branding/BrandingProvider"
import { AuthProvider } from "./auth/AuthProvider"
import { useAuth } from "./auth/useAuth"
import { homePathForRole } from "./lib/roles"
import { AdminBrandingPage } from "./pages/admin/AdminBrandingPage"
import { AdminCompaniesPage } from "./pages/admin/AdminCompaniesPage"
import { AdminLayout } from "./pages/admin/AdminLayout"
import { AdminSitesPage } from "./pages/admin/AdminSitesPage"
import { AdminUsersPage } from "./pages/admin/AdminUsersPage"
import { CompanyDashboardPage } from "./pages/company/CompanyDashboardPage"
import { CompanyLayout } from "./pages/company/CompanyLayout"
import { CompanyReportsPage } from "./pages/company/CompanyReportsPage"
import { SiteReportPage } from "./pages/reports/SiteReportPage"
import { CompanySitesPage } from "./pages/company/CompanySitesPage"
import { CompanyUsersPage } from "./pages/company/CompanyUsersPage"
import { InspectorHome } from "./pages/inspector/InspectorHome"
import { InspectorLayout } from "./pages/inspector/InspectorLayout"
import { InspectorMission } from "./pages/inspector/InspectorMission"
import { ExpertLayout } from "./pages/expert/ExpertLayout"
import { ExpertReviewPage } from "./pages/expert/ExpertReviewPage"
import { ExpertReviewQueuePage } from "./pages/expert/ExpertReviewQueuePage"
import { LoginPage } from "./pages/LoginPage"
import "./ui.css"
import "./game.css"

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
  return <Navigate to={homePathForRole(user.role)} replace />
}

export default function App() {
  return (
    <BrowserRouter basename={getRouterBasename()}>
      <BrandingProvider>
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
              <Route path="marca" element={<AdminBrandingPage />} />
              <Route path="sedes/:siteId/informe" element={<SiteReportPage />} />
            </Route>
            <Route path="empresa" element={<CompanyLayout />}>
              <Route index element={<CompanyDashboardPage />} />
              <Route path="usuarios" element={<CompanyUsersPage />} />
              <Route path="sedes" element={<CompanySitesPage />} />
              <Route path="sedes/:siteId/informe" element={<SiteReportPage />} />
              <Route path="informes" element={<CompanyReportsPage />} />
            </Route>
            <Route path="experto" element={<ExpertLayout />}>
              <Route index element={<ExpertReviewQueuePage />} />
              <Route path="revisar/:assessmentId" element={<ExpertReviewPage />} />
            </Route>
            <Route path="app" element={<InspectorLayout />}>
              <Route index element={<InspectorHome />} />
              <Route path="inspeccion/:siteId" element={<InspectorMission />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </AuthProvider>
      </BrandingProvider>
    </BrowserRouter>
  )
}
