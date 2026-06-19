import type { ReactNode } from "react"
import type { ViewMotion } from "../../lib/inspectorNav"
import { viewMotionClass } from "../../lib/inspectorNav"

type Props = {
  motion: ViewMotion
  className?: string
  children: ReactNode
}

/** Panel con animación de entrada al cambiar de vista (campo / expediente). */
export function InspectorViewPanel({ motion, className = "", children }: Props) {
  return (
    <div className={`inspector-view-panel ${viewMotionClass(motion)} ${className}`.trim()}>
      {children}
    </div>
  )
}
