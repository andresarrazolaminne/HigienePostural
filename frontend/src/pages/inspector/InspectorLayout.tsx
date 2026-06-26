import { AppShell } from "../../components/AppShell"
import { MedalNavIcon } from "../../components/icons/MedalNavIcon"

const NAV = [
  { to: "/app", label: "Inicio", end: true, icon: "🏠" },
  { to: "/app/medallas", label: "Medallas", iconNode: <MedalNavIcon /> },
]

export function InspectorLayout() {
  return <AppShell allowedRole="user" nav={NAV} areaLabel="Inspector" />
}
