import type { Medal } from "../../lib/gamification"

type Props = {
  medals: Medal[]
  title?: string
  /** Si true, separa visualmente obtenidas y pendientes. */
  grouped?: boolean
}

function MedalCard({ medal }: { medal: Medal }) {
  const pct = medal.progress
    ? Math.round((medal.progress.current / Math.max(medal.progress.target, 1)) * 100)
    : medal.earned
      ? 100
      : 0

  return (
    <li
      className={`medal-card ${medal.earned ? "is-earned" : "is-locked"}`}
      title={medal.description}
    >
      <span className="medal-icon" aria-hidden>
        {medal.earned ? medal.icon : "🔒"}
      </span>
      <span className="medal-text">
        <strong className="medal-title">{medal.title}</strong>
        <span className="medal-desc muted small">{medal.description}</span>
        {medal.progress && !medal.earned && (
          <span className="medal-progress" aria-hidden>
            <span className="medal-progress-fill" style={{ width: `${pct}%` }} />
          </span>
        )}
      </span>
    </li>
  )
}

function MedalList({ items }: { items: Medal[] }) {
  if (items.length === 0) return null
  return (
    <ul className="medal-grid">
      {items.map((m) => (
        <MedalCard key={m.id} medal={m} />
      ))}
    </ul>
  )
}

export function MedalGrid({ medals, title = "Medallas", grouped = false }: Props) {
  const earned = medals.filter((m) => m.earned)
  const pending = medals.filter((m) => !m.earned)

  return (
    <div className="medals">
      <div className="medals-head">
        <span className="section-heading">{title}</span>
        <span className="medals-count">
          {earned.length}/{medals.length}
        </span>
      </div>

      {grouped ? (
        <>
          {earned.length > 0 && (
            <section className="medals-section">
              <h3 className="medals-section-title">Obtenidas</h3>
              <MedalList items={earned} />
            </section>
          )}
          {pending.length > 0 && (
            <section className="medals-section">
              <h3 className="medals-section-title">Por conseguir</h3>
              <MedalList items={pending} />
            </section>
          )}
        </>
      ) : (
        <MedalList items={medals} />
      )}
    </div>
  )
}
