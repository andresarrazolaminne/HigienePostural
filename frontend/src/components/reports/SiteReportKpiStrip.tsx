import type { SiteReport } from "../../api/types"
import { formatScore100 } from "../../lib/score"
import { scoreToRank } from "../../lib/gameRank"

type Props = {
  report: SiteReport
}

export function SiteReportKpiStrip({ report }: Props) {
  const rank = scoreToRank(report.ergonomics.stats.avg)
  const ordenAvg = report.orden_aseo.stats.avg

  return (
    <section className="site-report-kpis" aria-label="Indicadores clave">
      <div className={`site-report-kpi site-report-kpi--${rank.tone}`}>
        <span className="site-report-kpi-label">Riesgo ergonómico medio</span>
        <span className="site-report-kpi-value">
          {report.ergonomics.stats.avg != null ? formatScore100(report.ergonomics.stats.avg) : "—"}
        </span>
        <span className="muted small">{rank.title}</span>
      </div>
      <div className="site-report-kpi">
        <span className="site-report-kpi-label">Orden y aseo medio</span>
        <span className="site-report-kpi-value">{ordenAvg != null ? formatScore100(ordenAvg) : "—"}</span>
      </div>
      <div className="site-report-kpi">
        <span className="site-report-kpi-label">Evidencias</span>
        <span className="site-report-kpi-value">{report.assessment_count}</span>
        <span className="muted small">{report.session_count} sesiones</span>
      </div>
      <div className="site-report-kpi">
        <span className="site-report-kpi-label">Alerta / crítico</span>
        <span className="site-report-kpi-value">{report.ergonomics.critical_percent}%</span>
        <span className="muted small">de las fotos</span>
      </div>
      <div className="site-report-kpi">
        <span className="site-report-kpi-label">Pendiente validación experta</span>
        <span className="site-report-kpi-value">{report.pending_professional_review_count}</span>
      </div>
    </section>
  )
}
