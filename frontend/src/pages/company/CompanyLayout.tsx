import { AppShell } from "../../components/AppShell"

const NAV = [
  { to: "/empresa", label: "Resumen", end: true, icon: "📊" },
  { to: "/empresa/sedes", label: "Sedes", icon: "📍" },
  { to: "/empresa/usuarios", label: "Equipo", icon: "👥" },
  { to: "/empresa/informes", label: "Informes", icon: "📋" },
]

export function CompanyLayout() {
  return <AppShell allowedRole="company_admin" nav={NAV} areaLabel="Empresa" />
}
