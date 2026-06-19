import type { ReactNode } from "react"

type Props = {
  siteName: string
  breadcrumb: ReactNode
  questTitle: string
  questSubtitle: string
  xpLabel?: string
  status?: ReactNode
}

export function MissionHero({ siteName, breadcrumb, questTitle, questSubtitle, xpLabel, status }: Props) {
  return (
    <header className="mission-hero">
      <div className="mission-hero-glow" aria-hidden />
      <div className="mission-hero-inner">
        <div className="mission-hero-top">
          <div className="mission-hero-meta">
            {breadcrumb}
            <p className="mission-hero-kicker">Inspección activa</p>
            <h1 className="mission-hero-title">{siteName}</h1>
          </div>
          <div className="mission-hero-badges">
            {xpLabel && <span className="xp-pill">{xpLabel}</span>}
            {status}
          </div>
        </div>
        <div className="mission-hero-quest">
          <span className="mission-hero-quest-icon" aria-hidden>
            🔍
          </span>
          <div>
            <strong className="mission-hero-quest-title">{questTitle}</strong>
            <p className="mission-hero-quest-sub muted small">{questSubtitle}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
