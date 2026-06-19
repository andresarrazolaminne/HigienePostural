import type { AssessmentListItem } from "../../api/types"
import { processingStatusLabel } from "../../lib/processingStatus"

type Props = {
  items: AssessmentListItem[]
}

export function ProcessingQueuePanel({ items }: Props) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="processing-queue-panel" aria-live="polite">
      <h3 className="section-heading-sm">Cola de análisis ({items.length})</h3>
      <p className="muted small processing-queue-hint">
        Puedes seguir capturando fotos. La IA procesará cada evidencia en orden.
      </p>
      <ul className="processing-queue-list">
        {items.map((a) => (
          <li key={a.id} className={`processing-queue-item processing-queue-item--${a.processing_status}`}>
            <span className="processing-queue-spinner" aria-hidden />
            <div>
              <strong>Informe #{a.id}</strong>
              <span className="muted small"> · {processingStatusLabel(a.processing_status)}</span>
              {a.processing_status === "failed" && a.processing_error && (
                <p className="form-error small">{a.processing_error}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
