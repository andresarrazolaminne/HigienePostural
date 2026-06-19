import { AuthenticatedImage } from "../AuthenticatedImage"
import { formatShortDate } from "../../lib/aggregates"
import { scoreToRank } from "../../lib/gameRank"
import { isProcessingStatus, processingStatusLabel } from "../../lib/processingStatus"
import { formatScore100 } from "../../lib/score"
import type { AssessmentListItem } from "../../api/types"

type Props = {
  photo: AssessmentListItem
  onSelect: () => void
  lazy?: boolean
}

export function EvidenceThumb({ photo, onSelect, lazy }: Props) {
  const pending = isProcessingStatus(photo.processing_status)
  const rank = scoreToRank(photo.calculated_score)
  const orden =
    photo.orden_aseo_score != null && Number.isFinite(photo.orden_aseo_score)
      ? formatScore100(photo.orden_aseo_score)
      : null

  return (
    <button type="button" className={`evidence-thumb ${pending ? "evidence-thumb--pending" : ""}`} onClick={onSelect}>
      <AuthenticatedImage
        assessmentId={photo.id}
        imageUrl={photo.image_url}
        alt="Evidencia"
        className="evidence-thumb-img"
        lazy={lazy}
      />
      {pending ? (
        <span className="evidence-thumb-badge evidence-thumb-badge--pending">
          {processingStatusLabel(photo.processing_status)}
        </span>
      ) : (
        <span className={`evidence-thumb-badge score-tone-${rank.tone}`}>
          {formatScore100(photo.calculated_score)}
        </span>
      )}
      {orden != null && <span className="evidence-thumb-orden muted small">Orden {orden}</span>}
      {photo.has_professional_notes && (
        <span className="evidence-thumb-notes" title="Notas profesionales">
          ✎
        </span>
      )}
      <span className="evidence-thumb-date muted small">{formatShortDate(photo.created_at)}</span>
    </button>
  )
}
