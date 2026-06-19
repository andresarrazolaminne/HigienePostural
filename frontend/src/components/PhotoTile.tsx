import { AuthenticatedImage } from "./AuthenticatedImage"
import { formatScore100 } from "../lib/score"
import { formatShortDate } from "../lib/aggregates"
import type { AssessmentListItem } from "../api/types"

type Props = {
  photo: AssessmentListItem
  index: number
  selected?: boolean
  hasNotes?: boolean
  onSelect: () => void
  onTechnical: () => void
}

export function PhotoTile({ photo, index, selected, hasNotes, onSelect, onTechnical }: Props) {
  return (
    <article className={`photo-tile ${selected ? "photo-tile-selected" : ""}`}>
      <button type="button" className="photo-tile-thumb" onClick={onSelect}>
        <AuthenticatedImage
          assessmentId={photo.id}
          imageUrl={photo.image_url}
          alt={`Foto ${index + 1}`}
          className="photo-tile-img"
        />
        <span className="photo-tile-badge">{formatScore100(photo.calculated_score)}</span>
        {(hasNotes ?? photo.has_professional_notes) && (
          <span className="photo-tile-notes-badge" title="Tiene notas profesionales">
            ✎
          </span>
        )}
      </button>
      <div className="photo-tile-body">
        <span className="muted small">Foto {index + 1}</span>
        <p className="photo-tile-issue">{photo.primary_issue}</p>
        <span className="muted small">{formatShortDate(photo.created_at)}</span>
        <div className="photo-tile-actions">
          <button type="button" className="btn sm primary" onClick={onSelect}>
            Ver resumen
          </button>
          <button type="button" className="btn sm ghost" onClick={onTechnical}>
            Técnico
          </button>
        </div>
      </div>
    </article>
  )
}
