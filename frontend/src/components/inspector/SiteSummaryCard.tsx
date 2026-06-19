import type { Site, WorkSession } from "../../api/types"
import type { ScoreStats } from "../../lib/aggregates"
import { formatScore100 } from "../../lib/score"

type Props = {
  site: Site
  siteScore: ScoreStats
  ordenAvg: number | null
  activeSession: WorkSession | null
  busy?: boolean
  onTechnicalSite?: () => void
  onCloseSession?: () => void
  onOpenSessions?: () => void
  onRefresh?: () => void
  sessionCount?: number
}

export function SiteSummaryCard({
  site,
  siteScore,
  ordenAvg,
  activeSession,
  busy,
  onTechnicalSite,
  onCloseSession,
  onOpenSessions,
  onRefresh,
  sessionCount = 0,
}: Props) {
  return (
    <section className="site-summary-card" aria-label="Resumen de la sede">
      <div className="site-summary-card-head">
        <div>
          <h2 className="site-summary-title">{site.name}</h2>
          {site.address && <p className="site-summary-address muted small">{site.address}</p>}
        </div>
        {activeSession ? (
          <span className="session-status-pill session-badge-open" role="status">
            Sesión #{activeSession.id}
          </span>
        ) : (
          <span className="session-status-pill session-badge-idle" role="status">
            Sin sesión
          </span>
        )}
      </div>
      <dl className="site-summary-metrics">
        <div>
          <dt>Fotos</dt>
          <dd>{siteScore.count}</dd>
        </div>
        <div>
          <dt>Ergonomía</dt>
          <dd>{siteScore.avg != null ? formatScore100(siteScore.avg) : "—"}</dd>
        </div>
        <div>
          <dt>Orden</dt>
          <dd>{ordenAvg != null ? formatScore100(ordenAvg) : "—"}</dd>
        </div>
      </dl>
      <div className="site-summary-actions">
        {onOpenSessions && (
          <button type="button" className="btn secondary sm" onClick={onOpenSessions} disabled={busy}>
            Sesiones ({sessionCount})
          </button>
        )}
        {onRefresh && (
          <button type="button" className="btn ghost sm" onClick={onRefresh} disabled={busy} title="Actualizar datos">
            ↻ Actualizar
          </button>
        )}
        {onTechnicalSite && siteScore.count > 0 && (
          <button type="button" className="btn ghost sm" onClick={onTechnicalSite}>
            Técnico sede
          </button>
        )}
        {activeSession && onCloseSession && (
          <button type="button" className="btn ghost sm" onClick={onCloseSession} disabled={busy}>
            Cerrar sesión
          </button>
        )}
      </div>
    </section>
  )
}
