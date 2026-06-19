import type { ScoreBucketRead } from "../../api/types"

type Props = {
  title: string
  buckets: ScoreBucketRead[]
  total: number
  variant?: "risk" | "orden"
}

export function SiteReportScoreChart({ title, buckets, total, variant = "risk" }: Props) {
  const max = Math.max(...buckets.map((b) => b.count), 1)

  return (
    <section className="site-report-chart" aria-label={title}>
      <h3 className="site-report-section-title">{title}</h3>
      {total === 0 ? (
        <p className="muted small">Sin datos en este período.</p>
      ) : (
        <ul className="site-report-bars">
          {buckets.map((b) => (
            <li key={b.label} className="site-report-bar-row">
              <span className="site-report-bar-label">{b.label}</span>
              <div className="site-report-bar-track">
                <div
                  className={`site-report-bar-fill site-report-bar-fill--${variant}`}
                  style={{ width: `${(b.count / max) * 100}%` }}
                />
              </div>
              <span className="site-report-bar-count">{b.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
