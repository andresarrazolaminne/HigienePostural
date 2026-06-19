import type { AssessmentListItem, WorkSession } from "../../api/types"
import { EmptyState } from "../ui/EmptyState"
import { EvidenceThumb } from "./EvidenceThumb"

export type GalleryFilterMode = "all" | "active" | "today" | "picked"

type Props = {
  photos: AssessmentListItem[]
  filterMode: GalleryFilterMode
  activeSession: WorkSession | null
  pickedSessionId: number | null
  pickedSessionLabel?: string
  onFilterChange: (mode: GalleryFilterMode) => void
  onClearPickedSession?: () => void
  onSelectPhoto: (id: number) => void
}

export function EvidenceGallery({
  photos,
  filterMode,
  activeSession,
  pickedSessionId,
  pickedSessionLabel,
  onFilterChange,
  onClearPickedSession,
  onSelectPhoto,
}: Props) {
  const emptyMessage =
    filterMode === "picked" && pickedSessionId
      ? `La sesión #${pickedSessionId} no tiene fotos.`
      : filterMode === "active" && activeSession
        ? "La sesión actual aún no tiene fotos. Registra fotos desde Campo."
        : filterMode === "today"
          ? "No hay evidencias registradas hoy en esta sede."
          : "Cuando registres la primera foto, aparecerá aquí."

  return (
    <section className="evidence-gallery" aria-label="Expediente fotográfico">
      <div className="evidence-gallery-filters" role="group" aria-label="Filtrar evidencias">
        <button
          type="button"
          className={`chip-filter ${filterMode === "all" && !pickedSessionId ? "chip-filter-active" : ""}`}
          onClick={() => {
            onClearPickedSession?.()
            onFilterChange("all")
          }}
        >
          Todas
        </button>
        {activeSession && (
          <button
            type="button"
            className={`chip-filter ${filterMode === "active" && !pickedSessionId ? "chip-filter-active" : ""}`}
            onClick={() => {
              onClearPickedSession?.()
              onFilterChange("active")
            }}
          >
            Sesión activa #{activeSession.id}
          </button>
        )}
        <button
          type="button"
          className={`chip-filter ${filterMode === "today" && !pickedSessionId ? "chip-filter-active" : ""}`}
          onClick={() => {
            onClearPickedSession?.()
            onFilterChange("today")
          }}
        >
          Hoy
        </button>
        {pickedSessionId != null && (
          <button
            type="button"
            className={`chip-filter chip-filter-picked chip-filter-active`}
            onClick={onClearPickedSession}
            title="Quitar filtro de sesión"
          >
            {pickedSessionLabel ?? `Sesión #${pickedSessionId}`} ×
          </button>
        )}
      </div>
      <p className="evidence-gallery-count muted small" aria-live="polite">
        {photos.length} evidencia{photos.length === 1 ? "" : "s"}
      </p>
      {photos.length === 0 ? (
        <EmptyState icon="📷" title="Sin evidencias" message={emptyMessage} />
      ) : (
        <div className="evidence-gallery-grid">
          {photos.map((p) => (
            <EvidenceThumb key={p.id} photo={p} onSelect={() => onSelectPhoto(p.id)} lazy />
          ))}
        </div>
      )}
    </section>
  )
}
