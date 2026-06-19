import { AuthenticatedImage } from "../AuthenticatedImage"
import { OrdenAseoPanel } from "../OrdenAseoPanel"
import { ProfessionalNotesPanel } from "../ProfessionalNotesPanel"
import { TechnicalSectionsBody, photoTechnicalSection } from "../TechnicalModal"
import { formatShortDate } from "../../lib/aggregates"
import { formatScore100 } from "../../lib/score"
import { isProcessingStatus, processingStatusLabel } from "../../lib/processingStatus"
import { ordenAseoScore, visionSummaryRows } from "../../lib/visionLabels"
import type { AssessmentDetail } from "../../api/types"

export type DetailTab = "resumen" | "tecnico"

type Props = {
  detail: AssessmentDetail
  tab: DetailTab
  onTabChange: (tab: DetailTab) => void
  onBack: () => void
  onNotesSaved: (updated: AssessmentDetail) => void
}

export function EvidenceDetailView({ detail, tab, onTabChange, onBack, onNotesSaved }: Props) {
  const pending = isProcessingStatus(detail.processing_status)
  const reviewPending = detail.review_status === "pending" && detail.processing_status === "completed"
  const scoreProvisional = detail.score_is_provisional ?? reviewPending
  const ordenScore = ordenAseoScore(detail)

  if (pending) {
    return (
      <article className="evidence-detail-view">
        <header className="evidence-detail-head">
          <button type="button" className="btn ghost sm" onClick={onBack}>
            ← Volver
          </button>
          <span className="muted small">Informe #{detail.id}</span>
        </header>
        <AuthenticatedImage
          assessmentId={detail.id}
          imageUrl={detail.image_url}
          alt="Evidencia"
          className="evidence-detail-img"
        />
        <p className="processing-queue-hint">
          {processingStatusLabel(detail.processing_status)}. El informe estará listo en unos momentos.
        </p>
      </article>
    )
  }

  if (detail.processing_status === "failed") {
    return (
      <article className="evidence-detail-view">
        <header className="evidence-detail-head">
          <button type="button" className="btn ghost sm" onClick={onBack}>
            ← Volver
          </button>
        </header>
        <p className="form-error">{detail.processing_error ?? "No se pudo analizar esta evidencia."}</p>
      </article>
    )
  }

  return (
    <article className="evidence-detail-view">
      <header className="evidence-detail-head">
        <button type="button" className="btn ghost sm" onClick={onBack}>
          ← Volver
        </button>
        <span className="muted small">Informe #{detail.id}</span>
      </header>

      <AuthenticatedImage
        assessmentId={detail.id}
        imageUrl={detail.image_url}
        alt="Evidencia seleccionada"
        className="evidence-detail-img"
      />

      <div className="detail-segmented" role="tablist" aria-label="Vista del informe">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "resumen"}
          className={`detail-segmented-item ${tab === "resumen" ? "detail-segmented-item-active" : ""}`}
          onClick={() => onTabChange("resumen")}
        >
          Resumen
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "tecnico"}
          className={`detail-segmented-item ${tab === "tecnico" ? "detail-segmented-item-active" : ""}`}
          onClick={() => onTabChange("tecnico")}
        >
          Técnico
        </button>
      </div>

      {tab === "resumen" ? (
        <div className="evidence-detail-body">
          {reviewPending && (
            <p className="processing-queue-hint" role="status">
              Pendiente de validación por un experto ergonómico. El puntaje mostrado es provisional (IA).
            </p>
          )}
          {detail.expert_reviewed && (
            <p className="muted small expert-reviewed-badge">Validado por experto ergonómico</p>
          )}
          <div className="photo-detail-scores">
            <div>
              <span className="muted small photo-score-label">
                Ergonomía{scoreProvisional ? " (provisional)" : ""}
              </span>
              <div className="photo-detail-score">{formatScore100(detail.calculated_score)}</div>
            </div>
            {ordenScore != null && (
              <div>
                <span className="muted small photo-score-label">Orden y aseo</span>
                <div className="photo-detail-score photo-detail-score-orden">{formatScore100(ordenScore)}</div>
              </div>
            )}
          </div>
          <p className="photo-detail-issue">{detail.primary_issue}</p>
          <p className="muted small">{formatShortDate(detail.created_at)}</p>
          <OrdenAseoPanel detail={detail} />
          <dl className="vision-dl vision-dl-friendly">
            {visionSummaryRows(detail.raw_ai_json ?? {}).slice(0, 4).map((row) => (
              <div key={row.label} className="vision-dl-row">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
          <ProfessionalNotesPanel
            assessmentId={detail.id}
            detail={detail}
            onSaved={onNotesSaved}
            mode="inspector"
          />
        </div>
      ) : (
        <div className="evidence-detail-body evidence-detail-technical">
          <TechnicalSectionsBody
            sections={photoTechnicalSection({
              ...detail,
              calculated_score: detail.calculated_score ?? 0,
              primary_issue: detail.primary_issue ?? "",
              raw_ai_json: detail.raw_ai_json ?? {},
            })}
          />
        </div>
      )}
    </article>
  )
}
