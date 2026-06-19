import type { ActionItemRead } from "../../api/types"

type Props = {
  items: ActionItemRead[]
  onViewAssessment: (id: number) => void
}

export function SiteReportActionList({ items, onViewAssessment }: Props) {
  if (items.length === 0) {
    return (
      <section className="site-report-section">
        <h3 className="site-report-section-title">Plan de acción sugerido</h3>
        <p className="muted small">No hay acciones prioritarias detectadas.</p>
      </section>
    )
  }

  return (
    <section className="site-report-section">
      <h3 className="site-report-section-title">Plan de acción sugerido</h3>
      <ol className="site-report-actions">
        {items.map((item) => (
          <li key={`${item.priority}-${item.title}-${item.assessment_id}`} className="site-report-action-item">
            <div>
              <strong>{item.title}</strong>
              <p className="muted small site-report-action-detail">{item.detail}</p>
            </div>
            {item.assessment_id != null && (
              <button type="button" className="btn secondary sm" onClick={() => onViewAssessment(item.assessment_id!)}>
                Foto #{item.assessment_id}
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
