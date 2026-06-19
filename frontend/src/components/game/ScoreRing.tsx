import { formatScore100 } from "../../lib/score"
import { scoreToRank, tierLabel, type GameRank } from "../../lib/gameRank"

type Props = {
  label: string
  score: number | null
  meta?: string
  size?: "sm" | "md" | "lg"
  onTechnical?: () => void
}

const SIZES = { sm: 72, md: 88, lg: 104 } as const
const STROKE = 7

export function ScoreRing({ label, score, meta, size = "md", onTechnical }: Props) {
  const dim = SIZES[size]
  const r = (dim - STROKE) / 2
  const c = 2 * Math.PI * r
  const rank: GameRank = scoreToRank(score)
  const offset = c - (rank.vitality / 100) * c

  return (
    <article className={`score-ring score-ring-${size} score-ring-tone-${rank.tone}`}>
      <div className="score-ring-visual">
        <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} aria-hidden>
          <circle
            className="score-ring-bg"
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            strokeWidth={STROKE}
          />
          <circle
            className="score-ring-progress"
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            strokeWidth={STROKE}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
          />
        </svg>
        <div className="score-ring-center">
          <span className={`score-ring-tier tier-${rank.tier}`}>{tierLabel(rank.tier)}</span>
          <span className="score-ring-value">{score != null ? formatScore100(score) : "—"}</span>
        </div>
      </div>
      <div className="score-ring-info">
        <strong className="score-ring-label">{label}</strong>
        {meta && <span className="muted small">{meta}</span>}
        <span className="score-ring-rank-title small">{rank.title}</span>
      </div>
      {onTechnical && score != null && (
        <button type="button" className="btn ghost sm score-ring-tech" onClick={onTechnical}>
          Detalle
        </button>
      )}
    </article>
  )
}
