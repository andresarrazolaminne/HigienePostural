import type { Achievement } from "../../lib/gamification"

type Props = {
  achievements: Achievement[]
  title?: string
}

export function AchievementBadges({ achievements, title = "Logros" }: Props) {
  const earned = achievements.filter((a) => a.earned).length
  return (
    <div className="achievements">
      <div className="achievements-head">
        <span className="section-heading">{title}</span>
        <span className="achievements-count">
          {earned}/{achievements.length}
        </span>
      </div>
      <ul className="achievement-grid">
        {achievements.map((a) => {
          const pct = a.progress
            ? Math.round((a.progress.current / Math.max(a.progress.target, 1)) * 100)
            : a.earned
              ? 100
              : 0
          return (
            <li
              key={a.id}
              className={`achievement-badge ${a.earned ? "is-earned" : "is-locked"}`}
              title={a.description}
            >
              <span className="achievement-icon" aria-hidden>
                {a.earned ? a.icon : "🔒"}
              </span>
              <span className="achievement-text">
                <strong className="achievement-title">{a.title}</strong>
                <span className="achievement-desc muted small">{a.description}</span>
                {a.progress && !a.earned && (
                  <span className="achievement-progress" aria-hidden>
                    <span className="achievement-progress-fill" style={{ width: `${pct}%` }} />
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
