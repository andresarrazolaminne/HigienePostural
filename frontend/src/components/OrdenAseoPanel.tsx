import { formatScore100 } from "../lib/score"
import { ordenScoreToRank, tierLabel } from "../lib/gameRank"
import {
  ordenAseoIssue,
  ordenAseoObservations,
  ordenAseoScore,
  ordenAseoSummaryRows,
} from "../lib/visionLabels"
import type { AssessmentDetail } from "../api/types"

type Props = {
  detail: AssessmentDetail
  compact?: boolean
}

export function OrdenAseoPanel({ detail, compact = false }: Props) {
  const score = ordenAseoScore(detail)
  if (score == null) {
    return (
      <section className="orden-aseo-panel orden-aseo-panel--empty">
        <h4>Orden y aseo</h4>
        <p className="muted small">No disponible en informes anteriores a esta versión.</p>
      </section>
    )
  }

  const rank = ordenScoreToRank(score)
  const issue = ordenAseoIssue(detail)
  const bullets = ordenAseoObservations(detail)
  const rows = ordenAseoSummaryRows(detail.raw_ai_json)

  return (
    <section className={`orden-aseo-panel orden-aseo-tone-${rank.tone}`}>
      <header className="orden-aseo-head">
        <div>
          <p className="orden-aseo-kicker">Apartado adicional</p>
          <h4>Orden y aseo</h4>
        </div>
        <div className="orden-aseo-score-block">
          <span className={`loot-tier tier-${rank.tier}`}>{tierLabel(rank.tier)}</span>
          <span className="orden-aseo-score">{formatScore100(score)}</span>
        </div>
      </header>
      {issue && <p className="orden-aseo-issue">{issue}</p>}
      {!compact && bullets.length > 0 && (
        <ul className="orden-aseo-list">
          {bullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      {!compact && rows.length > 0 && (
        <dl className="vision-dl vision-dl-friendly orden-aseo-dl">
          {rows.slice(1).map((row) => (
            <div key={row.label} className="vision-dl-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
