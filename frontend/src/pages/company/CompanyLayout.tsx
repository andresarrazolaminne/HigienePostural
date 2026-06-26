import { AppShell } from "../../components/AppShell"
import { MedalNavIcon } from "../../components/icons/MedalNavIcon"

const NAV = [
  { to: "/empresa", label: "Resumen", end: true, icon: "📊" },
  { to: "/empresa/medallas", label: "Medallas", iconNode: <MedalNavIcon /> },
  { to: "/empresa/sedes", label: "Sedes", icon: "📍" },
  { to: "/empresa/usuarios", label: "Equipo", icon: "👥" },
  { to: "/empresa/informes", label: "Informes", icon: "📋" },
]

export function CompanyLayout() {
  return <AppShell allowedRole="company_admin" nav={NAV} areaLabel="Empresa" />
}
