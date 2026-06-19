import { useEffect, useState } from "react"
import * as assessmentsApi from "../api/assessments"
import type { AssessmentDetail } from "../api/types"
import { formatShortDate } from "../lib/aggregates"

type Props = {
  assessmentId: number
  detail: Pick<
    AssessmentDetail,
    "professional_notes" | "notes_author_name" | "notes_updated_at"
  >
  onSaved: (updated: AssessmentDetail) => void
  /** Inspector ve lectura amable; admin empresa edita como profesional HSEQ */
  mode?: "inspector" | "professional"
}

export function ProfessionalNotesPanel({ assessmentId, detail, onSaved, mode = "inspector" }: Props) {
  const [text, setText] = useState(detail.professional_notes ?? "")
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setText(detail.professional_notes ?? "")
    setEditing(false)
  }, [assessmentId, detail.professional_notes])

  const hasNotes = Boolean(detail.professional_notes?.trim())
  const isProfessional = mode === "professional"

  async function save() {
    setError(null)
    setBusy(true)
    try {
      const updated = await assessmentsApi.updateAssessmentNotes(assessmentId, text.trim() || null)
      onSaved(updated)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar las notas")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="pro-notes">
      <div className="pro-notes-head">
        <div>
          <h4 className="pro-notes-title">
            {isProfessional ? "Tu revisión profesional" : "Acompañamiento profesional"}
          </h4>
          <p className="muted small pro-notes-lead">
            {isProfessional
              ? "Valida o corrige lo que propone la IA. El inspector verá tus observaciones."
              : "Observaciones del equipo HSEQ sobre este análisis (complementan la IA)."}
          </p>
        </div>
        {!editing && (
          <button type="button" className="btn sm secondary" onClick={() => setEditing(true)}>
            {hasNotes ? "Editar notas" : isProfessional ? "Añadir revisión" : "Añadir observación"}
          </button>
        )}
      </div>

      {hasNotes && !editing && (
        <blockquote className="pro-notes-quote">
          <p>{detail.professional_notes}</p>
          {(detail.notes_author_name || detail.notes_updated_at) && (
            <footer className="muted small">
              {detail.notes_author_name && <span>{detail.notes_author_name}</span>}
              {detail.notes_updated_at && (
                <span>
                  {detail.notes_author_name ? " · " : ""}
                  {formatShortDate(detail.notes_updated_at)}
                </span>
              )}
            </footer>
          )}
        </blockquote>
      )}

      {!hasNotes && !editing && (
        <p className="muted small pro-notes-empty">
          {isProfessional
            ? "Aún no has dejado una revisión en este informe."
            : "Sin notas del profesional todavía. Puedes añadir tus observaciones de campo."}
        </p>
      )}

      {editing && (
        <div className="pro-notes-edit">
          <label className="pro-notes-label">
            {isProfessional ? "Revisión ergonómica" : "Observaciones"}
            <textarea
              className="pro-notes-textarea"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                isProfessional
                  ? "Ej.: Confirmo riesgo en monitor bajo. Recomiendo elevador y pausa activa cada hora."
                  : "Ej.: Monitor efectivamente muy bajo; uso cojín lumbar propio."
              }
              maxLength={4000}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="pro-notes-actions">
            <button type="button" className="btn primary sm" onClick={() => void save()} disabled={busy}>
              {busy ? "Guardando…" : "Guardar notas"}
            </button>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => {
                setText(detail.professional_notes ?? "")
                setEditing(false)
                setError(null)
              }}
              disabled={busy}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
