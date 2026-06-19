import type { SessionSummaryRead } from "../../api/types"
import { formatShortDate } from "../../lib/aggregates"
import { formatScore100 } from "../../lib/score"

type Props = {
  sessions: SessionSummaryRead[]
}

export function SiteReportSessionsTimeline({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <section className="site-report-section">
        <h3 className="site-report-section-title">Sesiones de inspección</h3>
        <p className="muted small">Aún no hay sesiones en esta sede.</p>
      </section>
    )
  }

  return (
    <section className="site-report-section">
      <h3 className="site-report-section-title">Sesiones de inspección</h3>
      <ul className="site-report-sessions">
        {sessions.map((s) => (
          <li key={s.id} className="site-report-session-row">
            <div>
              <strong>Sesión #{s.id}</strong>
              <span className="muted small">
                {" "}
                · {formatShortDate(s.start_time)}
                {s.end_time ? ` — ${formatShortDate(s.end_time)}` : " (abierta)"}
              </span>
            </div>
            <div className="site-report-session-meta">
              <span>{s.photo_count} foto{s.photo_count === 1 ? "" : "s"}</span>
              <span className="score-pill">{s.avg_score != null ? formatScore100(s.avg_score) : "—"}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
