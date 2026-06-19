import { SessionListItem } from "../SessionListItem"
import type { WorkSession } from "../../api/types"

type Props = {
  open: boolean
  sessions: WorkSession[]
  activeSession: WorkSession | null
  busy?: boolean
  onClose: () => void
  onSelectSession: (sessionId: number) => void
  onDeleteSession: (sessionId: number) => void
  onNewSession: () => void
  onSessionTechnical: (session: WorkSession) => void
}

export function SessionManagerSheet({
  open,
  sessions,
  activeSession,
  busy,
  onClose,
  onSelectSession,
  onDeleteSession,
  onNewSession,
  onSessionTechnical,
}: Props) {
  if (!open) {
    return null
  }

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
  )

  return (
    <div className="inspector-sheet" role="presentation">
      <button type="button" className="inspector-sheet-backdrop" aria-label="Cerrar" onClick={onClose} />
      <div className="inspector-sheet-panel" role="dialog" aria-modal aria-labelledby="session-sheet-title">
        <header className="inspector-sheet-head">
          <h2 id="session-sheet-title">Sesiones de inspección</h2>
          <button type="button" className="btn ghost sm" onClick={onClose}>
            Cerrar
          </button>
        </header>
        <p className="muted small inspector-sheet-lead">
          {sessions.length} sesión{sessions.length === 1 ? "" : "es"} en esta sede. Toca una para ver sus fotos en el
          expediente.
        </p>
        <div className="inspector-sheet-actions">
          <button type="button" className="btn primary sm" onClick={onNewSession} disabled={busy}>
            + Nueva sesión
          </button>
        </div>
        {sorted.length === 0 ? (
          <p className="muted inspector-sheet-empty">Sin sesiones. Registra una foto para crear la primera sesión.</p>
        ) : (
          <ul className="session-timeline-list session-sheet-list">
            {sorted.map((s) => (
              <SessionListItem
                key={s.id}
                session={s}
                selected={activeSession?.id === s.id}
                busy={busy}
                onSelect={() => onSelectSession(s.id)}
                onDelete={() => onDeleteSession(s.id)}
                onTechnical={() => onSessionTechnical(s)}
              />
            ))}
          </ul>
        )}
        <p className="muted small inspector-sheet-foot">
          El icono 🗑 elimina la sesión y todas sus fotos. Usa solo si fue un error.
        </p>
      </div>
    </div>
  )
}
