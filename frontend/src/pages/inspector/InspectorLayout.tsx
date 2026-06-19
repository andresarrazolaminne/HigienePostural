import { AppShell } from "../../components/AppShell"

const NAV = [{ to: "/app", label: "Inicio", end: true, icon: "🏠" }]

export function InspectorLayout() {
  return <AppShell allowedRole="user" nav={NAV} areaLabel="Inspector" />
}
