import { formatScore100 } from "../lib/score"
import type { ScoreStats } from "../lib/aggregates"

type Props = {
  label: string
  stats: ScoreStats
  hint?: string
  size?: "sm" | "md" | "lg"
  onTechnical?: () => void
}

function scoreTone(avg: number | null): string {
  if (avg == null) {
    return "score-tone-neutral"
  }
  if (avg <= 40) {
    return "score-tone-good"
  }
  if (avg <= 65) {
    return "score-tone-mid"
  }
  return "score-tone-high"
}

export function ScoreCard({ label, stats, hint, size = "md", onTechnical }: Props) {
  const tone = scoreTone(stats.avg)
  const main = stats.avg != null ? formatScore100(stats.avg) : "—"

  return (
    <article className={`score-card score-card-${size} ${tone}`}>
      <div className="score-card-body">
        <span className="score-card-label">{label}</span>
        <span className="score-card-value">{main}</span>
        {stats.count > 0 && (
          <span className="score-card-meta muted small">
            {stats.count} foto{stats.count === 1 ? "" : "s"}
            {stats.min != null && stats.max != null && stats.count > 1
              ? ` · ${formatScore100(stats.min)} – ${formatScore100(stats.max)}`
              : ""}
          </span>
        )}
        {hint && <span className="score-card-hint muted small">{hint}</span>}
      </div>
      {onTechnical && stats.count > 0 && (
        <button type="button" className="btn ghost sm score-tech-btn" onClick={onTechnical}>
          Detalle técnico
        </button>
      )}
    </article>
  )
}
