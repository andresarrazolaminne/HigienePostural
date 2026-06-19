import { useEffect, useState } from "react"
import * as assessmentsApi from "../../api/assessments"
import type { AssessmentDetail, AssessmentListItem } from "../../api/types"
import { AuthenticatedImage } from "../../components/AuthenticatedImage"
import { EmptyState } from "../../components/ui/EmptyState"
import { PageHeader } from "../../components/ui/PageHeader"
import { ProfessionalNotesPanel } from "../../components/ProfessionalNotesPanel"
import { formatScore100 } from "../../lib/score"
import { ordenAseoScore, visionSummaryRows } from "../../lib/visionLabels"
import { OrdenAseoPanel } from "../../components/OrdenAseoPanel"

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("es", { dateStyle: "short", timeStyle: "short" })
  } catch {
    return iso
  }
}

export function CompanyReportsPage() {
  const [items, setItems] = useState<AssessmentListItem[]>([])
  const [detail, setDetail] = useState<AssessmentDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void assessmentsApi
      .listCompanyAssessments()
      .then(setItems)
      .catch((e) => setError(String(e)))
  }, [])

  async function openDetail(id: number) {
    setError(null)
    try {
      setDetail(await assessmentsApi.getAssessment(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    }
  }

  function onNotesSaved(updated: AssessmentDetail) {
    setDetail(updated)
    setItems((prev) =>
      prev.map((a) =>
        a.id === updated.id ? { ...a, has_professional_notes: updated.has_professional_notes } : a,
      ),
    )
  }

  return (
    <div className="page-pad">
      <PageHeader
        kicker="HSEQ"
        title="Informes"
        lead="Evaluaciones ergonómicas realizadas por tus inspectores. Revisa la IA y deja notas profesionales."
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Sin informes todavía"
          message="Los inspectores deben completar al menos una inspección con foto en sede."
        />
      ) : (
        <div className="assessment-card-grid">
          {items.map((a) => (
            <article key={a.id} className="assessment-card">
              <button type="button" className="assessment-card-thumb-wrap" onClick={() => void openDetail(a.id)}>
                <AuthenticatedImage
                  assessmentId={a.id}
                  imageUrl={a.image_url}
                  alt="Evaluación"
                  className="assessment-card-thumb"
                />
              </button>
              <div className="assessment-card-body">
                <div className="assessment-card-score-row">
                  <span className="score-pill">{formatScore100(a.calculated_score)}</span>
                  <span className="muted small">Sede #{a.site_id ?? "—"}</span>
                </div>
                <p className="assessment-card-issue">{a.primary_issue}</p>
                {a.has_professional_notes && (
                  <span className="notes-chip">Revisión profesional</span>
                )}
                <p className="muted small">{formatDate(a.created_at)}</p>
                <button type="button" className="btn sm primary assessment-card-cta" onClick={() => void openDetail(a.id)}>
                  Ver detalle
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {detail && (
        <div className="modal-back" role="presentation" onClick={() => setDetail(null)}>
          <div className="modal modal--wide" role="dialog" aria-modal onClick={(ev) => ev.stopPropagation()}>
            <header className="modal-head">
              <h3>Informe #{detail.id}</h3>
              <button type="button" className="btn ghost sm" onClick={() => setDetail(null)}>
                Cerrar
              </button>
            </header>
            <div className="modal-body modal-body-split">
              <div className="modal-photo-col">
                <AuthenticatedImage
                  assessmentId={detail.id}
                  imageUrl={detail.image_url}
                  alt="Foto"
                  className="modal-detail-photo"
                />
                <p className="muted small">
                  Ergonomía <strong>{formatScore100(detail.calculated_score)}</strong>
                  {ordenAseoScore(detail) != null && (
                    <>
                      {" "}
                      · Orden y aseo <strong>{formatScore100(ordenAseoScore(detail)!)}</strong>
                    </>
                  )}
                </p>
              </div>
              <div className="modal-summary-col">
                <p className="modal-primary-issue">{detail.primary_issue}</p>
                <OrdenAseoPanel detail={detail} compact />
                <dl className="vision-dl">
                  {visionSummaryRows(detail.raw_ai_json).map((row) => (
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
                  mode="professional"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
