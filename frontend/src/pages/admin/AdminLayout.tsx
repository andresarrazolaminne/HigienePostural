import { AppShell } from "../../components/AppShell"

const NAV = [
  { to: "/admin/usuarios", label: "Usuarios", icon: "👥" },
  { to: "/admin/empresas", label: "Empresas", icon: "🏢" },
  { to: "/admin/sedes", label: "Sedes", icon: "📍" },
  { to: "/admin/marca", label: "Marca", icon: "✨" },
]

export function AdminLayout() {
  return <AppShell allowedRole="super_admin" nav={NAV} areaLabel="Plataforma" />
}
