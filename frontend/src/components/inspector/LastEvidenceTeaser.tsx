import { AuthenticatedImage } from "../AuthenticatedImage"
import { formatShortDate } from "../../lib/aggregates"
import { formatScore100 } from "../../lib/score"
import { isProcessingStatus } from "../../lib/processingStatus"
import type { AssessmentListItem } from "../../api/types"

type Props = {
  photo: AssessmentListItem
  onOpen: () => void
}

export function LastEvidenceTeaser({ photo, onOpen }: Props) {
  const pending = isProcessingStatus(photo.processing_status)
  const score =
    photo.calculated_score != null && Number.isFinite(photo.calculated_score)
      ? formatScore100(photo.calculated_score)
      : pending
        ? "Analizando..."
        : "-"

  return (
    <section className="last-evidence-teaser view-panel-enter">
      <h3 className="section-heading-sm">Última evidencia</h3>
      <button type="button" className="last-evidence-teaser-btn last-evidence-teaser-btn--thumb" onClick={onOpen}>
        <AuthenticatedImage
          assessmentId={photo.id}
          imageUrl={photo.image_url}
          alt=""
          className="last-evidence-thumb"
          lazy
        />
        <div className="last-evidence-teaser-text">
          <span className="last-evidence-score">{score}</span>
          <span className="muted small">{formatShortDate(photo.created_at)}</span>
          {photo.primary_issue && <span className="last-evidence-issue">{photo.primary_issue}</span>}
        </div>
      </button>
    </section>
  )
}