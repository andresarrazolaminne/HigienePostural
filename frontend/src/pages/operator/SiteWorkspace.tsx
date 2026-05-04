import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import * as assessmentsApi from "../../api/assessments"
import * as sessionsApi from "../../api/sessions"
import * as sitesApi from "../../api/sites"
import type { AssessmentDetail, AssessmentListItem, Site, WorkSession } from "../../api/types"
import { AuthenticatedImage } from "../../components/AuthenticatedImage"
import { formatScore100 } from "../../lib/score"
import { visionSummaryRows } from "../../lib/visionLabels"

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es", {
      dateStyle: "short",
      timeStyle: "short",
    })
  } catch {
    return iso
  }
}

export function SiteWorkspace() {
  const { siteId } = useParams()
  const sid = Number(siteId)
  const [site, setSite] = useState<Site | null>(null)
  const [loadState, setLoadState] = useState<"loading" | "ok" | "missing">("loading")
  const [sessions, setSessions] = useState<WorkSession[]>([])
  const [assessments, setAssessments] = useState<AssessmentListItem[]>([])
  const [activeSession, setActiveSession] = useState<number | null>(null)
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<AssessmentDetail | null>(null)
  const [showRawJson, setShowRawJson] = useState(false)
  const [busy, setBusy] = useState(false)

  const filteredAssessments = useMemo(
    () => assessments.filter((a) => a.site_id === sid),
    [assessments, sid],
  )

  const siteStats = useMemo(() => {
    const list = filteredAssessments
    if (list.length === 0) {
      return { count: 0, avg: null as number | null, min: null as number | null, max: null as number | null }
    }
    const scores = list.map((a) => a.calculated_score)
    const sum = scores.reduce((a, b) => a + b, 0)
    return {
      count: list.length,
      avg: sum / scores.length,
      min: Math.min(...scores),
      max: Math.max(...scores),
    }
  }, [filteredAssessments])

  async function reloadAll() {
    const [sites, sess, asmt] = await Promise.all([
      sitesApi.listSitesMine(),
      sessionsApi.listMySessions(sid),
      assessmentsApi.listMyAssessments(),
    ])
    const s = sites.find((x) => x.id === sid) ?? null
    setSite(s)
    setLoadState(s ? "ok" : "missing")
    setSessions(sess)
    setAssessments(asmt)
  }

  useEffect(() => {
    if (!Number.isFinite(sid)) {
      return
    }
    setLoadState("loading")
    void reloadAll().catch((e) => {
      setError(String(e))
      setLoadState("missing")
    })
  }, [sid])

  async function newSession() {
    setError(null)
    setBusy(true)
    try {
      const ws = await sessionsApi.createSession(sid)
      setActiveSession(ws.id)
      setUploadMsg("Sesión creada. Sube una foto para analizarla.")
      await reloadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setBusy(false)
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const sessionId = activeSession ?? sessions[0]?.id
    if (!file || !sessionId) {
      setError("Crea primero una sesión de evaluación o elige una sesión activa.")
      e.target.value = ""
      return
    }
    setError(null)
    setBusy(true)
    setUploadMsg(null)
    try {
      await assessmentsApi.uploadAssessment(sessionId, file)
      setUploadMsg("Listo. El informe se ha guardado.")
      await reloadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir")
    } finally {
      setBusy(false)
      e.target.value = ""
    }
  }

  async function showDetail(id: number) {
    setError(null)
    setShowRawJson(false)
    try {
      const d = await assessmentsApi.getAssessment(id)
      setDetail(d)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    }
  }

  if (!Number.isFinite(sid)) {
    return <p className="page-pad">ID no válido</p>
  }

  if (loadState === "loading") {
    return (
      <div className="page-pad">
        <p className="muted">Cargando sede…</p>
      </div>
    )
  }

  if (loadState === "missing" || site === null) {
    return (
      <div className="page-pad">
        <p className="form-error">No encontramos esta sede o no tienes acceso.</p>
        <Link to="/app">Volver</Link>
      </div>
    )
  }

  return (
    <div className="page-pad workspace-page">
      <p className="breadcrumb">
        <Link to="/app">Mis sedes</Link> / <span>{site.name}</span>
      </p>
      <header className="workspace-header">
        <div>
          <h2 className="workspace-title">{site.name}</h2>
          {site.address && <p className="muted workspace-sub">{site.address}</p>}
        </div>
        <div className="site-summary-bar" role="status">
          {siteStats.count === 0 ? (
            <span className="muted">Aún no hay evaluaciones en esta sede.</span>
          ) : (
            <>
              <span className="site-summary-stat">
                <strong>{siteStats.count}</strong> foto{siteStats.count === 1 ? "" : "s"}
              </span>
              <span className="site-summary-dot" aria-hidden>
                ·
              </span>
              <span className="site-summary-stat">
                Media <strong>{formatScore100(siteStats.avg)}</strong>
              </span>
              <span className="site-summary-dot" aria-hidden>
                ·
              </span>
              <span className="site-summary-stat muted">
                Rango {formatScore100(siteStats.min)} — {formatScore100(siteStats.max)}
              </span>
            </>
          )}
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}
      {uploadMsg && <p className="notice ok">{uploadMsg}</p>}

      <section className="panel workspace-toolbar">
        <div className="workspace-toolbar-text">
          <h3>Nueva evaluación</h3>
          <p className="muted small">
            Crea una sesión por visita. Luego sube una foto JPG o PNG; el servidor la analiza con IA (requiere clave
            OpenAI).
          </p>
        </div>
        <div className="row-actions wrap workspace-toolbar-actions">
          <button type="button" className="btn primary" onClick={() => void newSession()} disabled={busy}>
            Nueva sesión
          </button>
          <label className="btn secondary file-btn">
            Subir foto
            <input type="file" accept="image/jpeg,image/png" capture="environment" onChange={(e) => void onFile(e)} disabled={busy} />
          </label>
        </div>
      </section>

      <section className="panel">
        <h3 className="section-title">Sesiones de trabajo</h3>
        <p className="muted small section-lead">
          Cada sesión agrupa las fotos de una misma visita. El resumen muestra cuántas fotos hay y la puntuación
          agregada (escala 0–100).
        </p>
        {sessions.length === 0 ? (
          <p className="muted">Todavía no hay sesiones. Pulsa «Nueva sesión» para empezar.</p>
        ) : (
          <div className="session-card-grid">
            {sessions.map((s) => {
              const open = s.end_time == null
              const count = s.assessment_count ?? 0
              return (
                <article
                  key={s.id}
                  className={`session-card ${s.id === activeSession ? "session-card-active" : ""}`}
                >
                  <div className="session-card-top">
                    <span className="session-id">Sesión #{s.id}</span>
                    <span className={`session-badge ${open ? "session-badge-open" : "session-badge-closed"}`}>
                      {open ? "Abierta" : "Cerrada"}
                    </span>
                  </div>
                  <p className="session-card-dates muted small">
                    {formatShortDate(s.start_time)}
                    {s.end_time ? ` → ${formatShortDate(s.end_time)}` : ""}
                  </p>
                  <dl className="session-compilado">
                    <div>
                      <dt>Fotos en la sesión</dt>
                      <dd>{count}</dd>
                    </div>
                    <div>
                      <dt>Promedio</dt>
                      <dd>{count ? formatScore100(s.average_score) : "—"}</dd>
                    </div>
                    <div>
                      <dt>Mín / máx</dt>
                      <dd>
                        {count ? (
                          <>
                            {formatScore100(s.min_score)} — {formatScore100(s.max_score)}
                          </>
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                  </dl>
                  <button type="button" className="btn sm secondary session-use-btn" onClick={() => setActiveSession(s.id)}>
                    Usar para próxima subida
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="panel" id="informes-sede">
        <h3 className="section-title">Fotos e informes</h3>
        {filteredAssessments.length === 0 ? (
          <p className="muted">Aún no hay informes para esta sede.</p>
        ) : (
          <div className="assessment-card-grid">
            {filteredAssessments.map((a) => (
              <article key={a.id} className="assessment-card">
                <button type="button" className="assessment-card-thumb-wrap" onClick={() => void showDetail(a.id)}>
                  <AuthenticatedImage assessmentId={a.id} alt="Evaluación" className="assessment-card-thumb" />
                </button>
                <div className="assessment-card-body">
                  <div className="assessment-card-score-row">
                    <span className="score-pill">{formatScore100(a.calculated_score)}</span>
                    <span className="muted small">Sesión #{a.session_id}</span>
                  </div>
                  <p className="assessment-card-issue">{a.primary_issue}</p>
                  <p className="muted small">{formatShortDate(a.created_at)}</p>
                  <button type="button" className="btn sm primary assessment-card-cta" onClick={() => void showDetail(a.id)}>
                    Ver foto y resumen
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

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
                <AuthenticatedImage assessmentId={detail.id} alt="Foto evaluada" className="modal-detail-photo" />
                <p className="muted small modal-photo-meta">
                  Puntuación global <strong>{formatScore100(detail.calculated_score)}</strong>
                </p>
              </div>
              <div className="modal-summary-col">
                <h4 className="modal-summary-title">Resumen ergonómico</h4>
                <p className="modal-primary-issue">{detail.primary_issue}</p>
                <dl className="vision-dl">
                  {visionSummaryRows(detail.raw_ai_json).map((row) => (
                    <div key={row.label} className="vision-dl-row">
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
                <button type="button" className="btn ghost sm json-toggle" onClick={() => setShowRawJson((v) => !v)}>
                  {showRawJson ? "Ocultar JSON técnico" : "Ver JSON técnico"}
                </button>
                {showRawJson && (
                  <pre className="json-pre json-pre-tight">{JSON.stringify(detail.raw_ai_json, null, 2)}</pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
