import { AppShell } from "../../components/AppShell"

const NAV = [
  { to: "/experto", label: "Cola de revisión", end: true, icon: "✓" },
]

export function ExpertLayout() {
  return <AppShell allowedRole="expert" nav={NAV} areaLabel="Experto ergonómico" />
}
