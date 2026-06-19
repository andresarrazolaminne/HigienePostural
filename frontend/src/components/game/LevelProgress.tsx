import type { PlayerLevel } from "../../lib/gamification"

type Props = {
  level: PlayerLevel
  /** Etiqueta de rol/contexto, ej. "Inspector de campo". */
  roleLabel?: string
  /** Texto contextual bajo la barra (ej. "12 evidencias"). */
  meta?: string
}

export function LevelProgress({ level, roleLabel, meta }: Props) {
  const pct = Math.round(level.progress * 100)
  return (
    <div className="level-card">
      <div className="level-card-badge" aria-hidden>
        <span className="level-card-badge-num">{level.level}</span>
        <span className="level-card-badge-tag">NVL</span>
      </div>
      <div className="level-card-body">
        <div className="level-card-top">
          <strong className="level-card-title">{level.title}</strong>
          {roleLabel && <span className="level-card-role muted small">{roleLabel}</span>}
        </div>
        <div
          className="level-bar"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progreso de nivel"
        >
          <span className="level-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="level-card-foot">
          <span className="muted small">
            {level.maxed ? "Nivel máximo alcanzado" : `${level.xpToNext} XP para nivel ${level.level + 1}`}
          </span>
          {meta && <span className="muted small">{meta}</span>}
        </div>
      </div>
    </div>
  )
}
