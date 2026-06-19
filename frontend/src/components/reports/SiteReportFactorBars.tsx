import { labelForFactor, labelForOrdenFlag } from "../../lib/siteReportLabels"

type Props = {
  title: string
  counts: Record<string, number>
  total: number
  kind: "ergonomic" | "orden"
}

export function SiteReportFactorBars({ title, counts, total, kind }: Props) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) {
    return null
  }

  const max = Math.max(...entries.map((e) => e[1]), 1)
  const labelFn = kind === "ergonomic" ? labelForFactor : labelForOrdenFlag

  return (
    <section className="site-report-section">
      <h3 className="site-report-section-title">{title}</h3>
      <ul className="site-report-bars">
        {entries.map(([key, count]) => (
          <li key={key} className="site-report-bar-row">
            <span className="site-report-bar-label">{labelFn(key)}</span>
            <div className="site-report-bar-track">
              <div
                className="site-report-bar-fill site-report-bar-fill--orden"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="site-report-bar-count">
              {count}
              {total > 0 && <span className="muted small"> ({Math.round((100 * count) / total)}%)</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
