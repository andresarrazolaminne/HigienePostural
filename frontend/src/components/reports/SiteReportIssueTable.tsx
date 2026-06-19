import type { TopIssueRead } from "../../api/types"
import { formatScore100 } from "../../lib/score"
import { formatShortDate } from "../../lib/aggregates"

type Props = {
  title: string
  issues: TopIssueRead[]
  scoreLabel: string
  onViewAssessment: (id: number) => void
}

export function SiteReportIssueTable({ title, issues, scoreLabel, onViewAssessment }: Props) {
  if (issues.length === 0) {
    return (
      <section className="site-report-section">
        <h3 className="site-report-section-title">{title}</h3>
        <p className="muted small">Sin hallazgos registrados.</p>
      </section>
    )
  }

  return (
    <section className="site-report-section">
      <h3 className="site-report-section-title">{title}</h3>
      <div className="site-report-table-wrap">
        <table className="site-report-table">
          <thead>
            <tr>
              <th>Hallazgo</th>
              <th>Veces</th>
              <th>{scoreLabel}</th>
              <th>Última vez</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {issues.map((row) => (
              <tr key={row.text}>
                <td>{row.text}</td>
                <td>{row.count}</td>
                <td>{formatScore100(row.worst_score)}</td>
                <td className="muted small">{formatShortDate(row.last_at)}</td>
                <td>
                  {row.assessment_ids[0] != null && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => onViewAssessment(row.assessment_ids[0])}
                    >
                      Ver
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
