import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import * as assessmentsApi from "../../api/assessments"
import type { AssessmentDetailExpert } from "../../api/types"
import { AuthenticatedImage } from "../../components/AuthenticatedImage"
import { OrdenAseoPanel } from "../../components/OrdenAseoPanel"
import { LoadingBlock } from "../../components/ui/LoadingBlock"
import { formatScore100 } from "../../lib/score"
import { severityLabel } from "../../lib/visionLabels"

const SEVERITY_OPTIONS = ["none", "mild", "moderate", "severe", "not_observable"] as const

export function ExpertReviewPage() {
  const { assessmentId } = useParams()
  const id = Number(assessmentId)
  const navigate = useNavigate()
  const [detail, setDetail] = useState<AssessmentDetailExpert | null>(null)
  const [score, setScore] = useState("")
  const [issue, setIssue] = useState("")
  const [notes, setNotes] = useState("")
  const [desorden, setDesorden] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) return
    const d = await assessmentsApi.getAssessmentExpert(id)
    setDetail(d)
    const ai = d.ai
    setScore(String(ai?.calculated_score ?? d.calculated_score ?? ""))
    setIssue(ai?.primary_issue ?? d.primary_issue ?? "")
    setNotes(d.review?.expert_review_notes ?? "")
    const v = ai?.vision ?? {}
    if (typeof v.desorden_superficie === "string") setDesorden(v.desorden_superficie)
  }, [id])

  useEffect(() => {
    void load().catch((e) => setError(String(e)))
  }, [load])

  async function submit(action: "approve" | "correct", e?: FormEvent) {
    e?.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const parsedScore = score.trim() === "" ? null : Number(score)
      if (parsedScore != null && (parsedScore < 0 || parsedScore > 100)) {
        throw new Error("El score debe estar entre 0 y 100")
      }
      const vision_patch: Record<string, unknown> = {}
      if (desorden && SEVERITY_OPTIONS.includes(desorden as (typeof SEVERITY_OPTIONS)[number])) {
        vision_patch.desorden_superficie = desorden
      }
      await assessmentsApi.submitExpertReview(id, {
        action,
        calculated_score: parsedScore,
        primary_issue: issue.trim() || null,
        vision_patch: Object.keys(vision_patch).length ? vision_patch : null,
        review_notes: notes.trim() || null,
      })
      navigate("/experto", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setBusy(false)
    }
  }

  if (!detail) {
    return (
      <div className="page-pad">
        {error ? <p className="form-error">{error}</p> : <LoadingBlock label="Cargando informe…" />}
      </div>
    )
  }

  const ai = detail.ai

  return (
    <div className="page-pad expert-review-page">
      <p>
        <Link to="/experto" className="btn ghost sm">
          ← Cola
        </Link>
      </p>
      <h1 className="page-title">Revisión informe #{detail.id}</h1>
      {error && <p className="form-error">{error}</p>}

      <AuthenticatedImage
        assessmentId={detail.id}
        imageUrl={detail.image_url}
        alt="Evidencia"
        className="evidence-detail-img"
      />

      <section className="panel expert-ai-block">
        <h3>Salida IA (referencia)</h3>
        <p>
          Score: <strong>{formatScore100(ai?.calculated_score ?? null)}</strong>
        </p>
        <p className="muted">{ai?.primary_issue}</p>
      </section>

      <form className="panel expert-review-form" onSubmit={(e) => void submit("correct", e)}>
        <h3>Tu validación</h3>
        <label>
          Score ergonómico (0–100)
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            required
          />
        </label>
        <label>
          Hallazgo principal
          <textarea value={issue} onChange={(e) => setIssue(e.target.value)} rows={3} required />
        </label>
        <label>
          Desorden en superficie
          <select value={desorden} onChange={(e) => setDesorden(e.target.value)}>
            <option value="">— Sin cambio —</option>
            {SEVERITY_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {severityLabel(o)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Notas de revisión
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </label>
        <OrdenAseoPanel detail={{ ...detail, raw_ai_json: ai?.vision ?? {} }} />
        <div className="expert-review-actions">
          <button type="button" className="btn secondary" disabled={busy} onClick={() => void submit("approve")}>
            Aprobar IA sin cambios
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "Guardando…" : "Guardar corrección"}
          </button>
        </div>
      </form>
    </div>
  )
}
