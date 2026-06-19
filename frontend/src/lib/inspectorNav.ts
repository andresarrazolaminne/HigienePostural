export type InspectorSiteView = "campo" | "expediente" | "detalle"

const VIEW_ORDER: Record<InspectorSiteView, number> = {
  campo: 0,
  expediente: 1,
  detalle: 2,
}

export type ViewMotion = "forward" | "back"

export function viewMotion(from: InspectorSiteView, to: InspectorSiteView): ViewMotion {
  if (from === to) return "forward"
  return VIEW_ORDER[to] >= VIEW_ORDER[from] ? "forward" : "back"
}

export function viewMotionClass(motion: ViewMotion): string {
  return motion === "forward" ? "view-motion-forward" : "view-motion-back"
}
