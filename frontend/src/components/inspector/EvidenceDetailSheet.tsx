import type { ReactNode } from "react"

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

/** Detalle de foto: panel inferior en móvil, página en escritorio. */
export function EvidenceDetailSheet({ open, onClose, title, children }: Props) {
  if (!open) {
    return null
  }

  return (
    <div className="evidence-detail-sheet" role="presentation">
      <button type="button" className="evidence-detail-sheet-backdrop" aria-label="Cerrar detalle" onClick={onClose} />
      <div className="evidence-detail-sheet-panel" role="dialog" aria-modal aria-label={title ?? "Detalle de evidencia"}>
        {children}
      </div>
    </div>
  )
}
