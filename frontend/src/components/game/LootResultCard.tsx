import type { ReactNode } from "react"
import { formatScore100 } from "../../lib/score"
import { scoreToRank, tierLabel } from "../../lib/gameRank"
import type { AssessmentDetail } from "../../api/types"
import { AuthenticatedImage } from "../AuthenticatedImage"
import { OrdenAseoPanel } from "../OrdenAseoPanel"

type Props = {
  detail: AssessmentDetail
  children?: ReactNode
}

export function LootResultCard({ detail, children }: Props) {
  const rank = scoreToRank(detail.calculated_score)

  return (
    <article className={`loot-card loot-card-${rank.tone}`}>
      <div className="loot-card-burst" aria-hidden />
      <header className="loot-card-head loot-card-head-dual">
        <div className="loot-score-col">
          <span className={`loot-tier tier-${rank.tier}`}>{tierLabel(rank.tier)}</span>
          <div>
            <p className="loot-card-kicker">Ergonomía (RULA/ROSA)</p>
            <h3 className="loot-card-score">{formatScore100(detail.calculated_score)}</h3>
            <p className="loot-card-rank">
              {rank.title} · {rank.subtitle}
            </p>
          </div>
        </div>
      </header>
      <p className="loot-card-issue">{detail.primary_issue}</p>
      <OrdenAseoPanel detail={detail} compact />
      <AuthenticatedImage
        assessmentId={detail.id}
        imageUrl={detail.image_url}
        alt="Foto evaluada"
        className="loot-card-img"
      />
      {children}
    </article>
  )
}
