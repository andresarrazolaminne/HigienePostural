import { formatScore100 } from "../lib/score"
import { formatShortDate, sessionStatsFromSession } from "../lib/aggregates"
import type { WorkSession } from "../api/types"

type Props = {
  session: WorkSession
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  onTechnical?: () => void
  busy?: boolean
}

export function SessionListItem({ session, selected, onSelect, onDelete, onTechnical, busy }: Props) {
  const st = sessionStatsFromSession(session)
  const isOpen = session.end_time == null

  return (
    <li className="session-list-row">
      <button
        type="button"
        className={`session-timeline-item ${selected ? "session-timeline-item-active" : ""}`}
        onClick={onSelect}
      >
        <div className="session-timeline-top">
          <strong>Sesión #{session.id}</strong>
          <span className={`session-badge ${isOpen ? "session-badge-open" : "session-badge-closed"}`}>
            {isOpen ? "Abierta" : "Cerrada"}
          </span>
        </div>
        <span className="muted small">{formatShortDate(session.start_time)}</span>
        <div className="session-timeline-scores">
          <span className="score-pill">{st.avg != null ? formatScore100(st.avg) : "—"}</span>
          <span className="muted small">
            {st.count} foto{st.count === 1 ? "" : "s"}
          </span>
        </div>
      </button>
      <div className="session-row-actions">
        {onTechnical && (session.assessment_count ?? 0) > 0 && (
          <button
            type="button"
            className="btn icon-btn ghost session-tech-btn"
            title="Detalle técnico"
            aria-label={`Técnico sesión ${session.id}`}
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation()
              onTechnical()
            }}
          >
            ⚙
          </button>
        )}
        <button
          type="button"
          className="btn icon-btn danger-ghost session-delete-btn"
          title="Eliminar sesión"
          aria-label={`Eliminar sesión ${session.id}`}
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          🗑
        </button>
      </div>
    </li>
  )
}
