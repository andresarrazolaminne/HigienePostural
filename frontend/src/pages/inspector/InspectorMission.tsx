import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import * as assessmentsApi from "../../api/assessments"
import * as sessionsApi from "../../api/sessions"
import * as sitesApi from "../../api/sites"
import { LootResultCard } from "../../components/game/LootResultCard"
import { EvidenceDetailView, type DetailTab } from "../../components/inspector/EvidenceDetailView"
import { EvidenceDetailSheet } from "../../components/inspector/EvidenceDetailSheet"
import { EvidenceGallery, type GalleryFilterMode } from "../../components/inspector/EvidenceGallery"
import { InspectorActionBar } from "../../components/inspector/InspectorActionBar"
import { ProcessingQueuePanel } from "../../components/inspector/ProcessingQueuePanel"
import { LastEvidenceTeaser } from "../../components/inspector/LastEvidenceTeaser"
import { SessionManagerSheet } from "../../components/inspector/SessionManagerSheet"
import { InspectorViewPanel } from "../../components/inspector/InspectorViewPanel"
import { SiteSummaryCard } from "../../components/inspector/SiteSummaryCard"
import { ProfessionalNotesPanel } from "../../components/ProfessionalNotesPanel"
import { TechnicalModal, type TechnicalSection } from "../../components/TechnicalModal"
import { LoadingBlock } from "../../components/ui/LoadingBlock"
import {
  assessmentsForSession,
  formatShortDate,
  sessionStatsFromSession,
  siteStats,
  statsFromScores,
} from "../../lib/aggregates"
import { isProcessingStatus } from "../../lib/processingStatus"
import { formatFetchError } from "../../api/http"
import { viewMotion, type ViewMotion } from "../../lib/inspectorNav"
import { formatScore100 } from "../../lib/score"
import type { AssessmentDetail, AssessmentListItem, Site, WorkSession } from "../../api/types"

type SiteView = "campo" | "expediente" | "detalle"

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString()
}

export function InspectorMission() {
  const { siteId } = useParams()
  const sid = Number(siteId)

  const [site, setSite] = useState<Site | null>(null)
  const [sessions, setSessions] = useState<WorkSession[]>([])
  const [assessments, setAssessments] = useState<AssessmentListItem[]>([])
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null)
  const [siteView, setSiteView] = useState<SiteView>("campo")
  const [viewMotionDir, setViewMotionDir] = useState<ViewMotion>("forward")

  function navigateSiteView(next: SiteView) {
    if (next === siteView) return
    setViewMotionDir(viewMotion(siteView, next))
    setSiteView(next)
  }
  const [galleryFilterMode, setGalleryFilterMode] = useState<GalleryFilterMode>("all")
  const [galleryPickedSessionId, setGalleryPickedSessionId] = useState<number | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>("resumen")
  const [detailReturnView, setDetailReturnView] = useState<Exclude<SiteView, "detalle">>("expediente")
  const [photoDetail, setPhotoDetail] = useState<AssessmentDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [lastUpload, setLastUpload] = useState<AssessmentDetail | null>(null)
  const [showPostCapture, setShowPostCapture] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [siteTechOpen, setSiteTechOpen] = useState(false)
  const [sessionTechTarget, setSessionTechTarget] = useState<WorkSession | null>(null)
  const [sessionsSheetOpen, setSessionsSheetOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploadingCount, setUploadingCount] = useState(0)
  const [watchIds, setWatchIds] = useState<number[]>([])
  const captureInputRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    const [sites, sess, asm] = await Promise.all([
      sitesApi.listSitesMine(),
      sessionsApi.listMySessions(sid),
      assessmentsApi.listMyAssessments(),
    ])
    const s = sites.find((x) => x.id === sid) ?? null
    const siteAsm = asm.filter((a) => a.site_id === sid)
    setSite(s)
    setSessions(sess)
    setAssessments(siteAsm)
    const open = sess.find((x) => x.end_time == null) ?? null
    setActiveSession(open)
    return { open, sess }
  }, [sid])

  useEffect(() => {
    if (!Number.isFinite(sid)) {
      return
    }
    setLoading(true)
    void reload()
      .catch((e) => setError(formatFetchError(e)))
      .finally(() => setLoading(false))
  }, [sid, reload])

  async function handleRefresh() {
    setRefreshing(true)
    setError(null)
    try {
      await reload()
    } catch (e) {
      setError(formatFetchError(e))
    } finally {
      setRefreshing(false)
    }
  }

  const siteScore = useMemo(() => siteStats(assessments, sid), [assessments, sid])

  const siteOrdenAvg = useMemo(() => {
    const scores = assessments
      .filter((a) => a.processing_status === "completed")
      .map((a) => a.orden_aseo_score)
      .filter((s): s is number => s != null && Number.isFinite(s))
    return statsFromScores(scores).avg
  }, [assessments])

  const allSitePhotos = useMemo(
    () =>
      [...assessments].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [assessments],
  )

  const galleryPhotos = useMemo(() => {
    if (galleryPickedSessionId != null) {
      return assessmentsForSession(assessments, galleryPickedSessionId)
    }
    if (galleryFilterMode === "active" && activeSession) {
      return assessmentsForSession(assessments, activeSession.id)
    }
    if (galleryFilterMode === "today") {
      return allSitePhotos.filter((p) => isToday(p.created_at))
    }
    return allSitePhotos
  }, [galleryPickedSessionId, galleryFilterMode, activeSession, assessments, allSitePhotos])

  const latestPhoto = allSitePhotos[0] ?? null

  const processingQueue = useMemo(
    () =>
      assessments
        .filter((a) => isProcessingStatus(a.processing_status) || a.processing_status === "failed")
        .sort((a, b) => b.id - a.id),
    [assessments],
  )

  useEffect(() => {
    if (processingQueue.length === 0 && watchIds.length === 0) {
      return
    }
    const timer = window.setInterval(() => {
      void reload()
    }, 2500)
    return () => clearInterval(timer)
  }, [processingQueue.length, watchIds.length, reload])

  useEffect(() => {
    if (watchIds.length === 0) {
      return
    }
    for (const id of watchIds) {
      const item = assessments.find((a) => a.id === id)
      if (!item) {
        continue
      }
      if (item.processing_status === "completed") {
        void assessmentsApi.getAssessment(id).then((detail) => {
          setLastUpload(detail)
          setShowPostCapture(true)
          navigateSiteView("campo")
        })
        setWatchIds((prev) => prev.filter((x) => x !== id))
      } else if (item.processing_status === "failed") {
        setError(item.processing_error ?? "Error al analizar la evidencia")
        setWatchIds((prev) => prev.filter((x) => x !== id))
      }
    }
  }, [assessments, watchIds])
  const pickedSession = sessions.find((s) => s.id === galleryPickedSessionId) ?? null

  async function loadPhotoDetail(id: number): Promise<AssessmentDetail> {
    setError(null)
    const d = await assessmentsApi.getAssessment(id)
    setPhotoDetail(d)
    return d
  }

  async function openPhotoDetail(
    id: number,
    tab: DetailTab = "resumen",
    returnTo: Exclude<SiteView, "detalle"> = siteView === "expediente" ? "expediente" : "campo",
  ) {
    setDetailReturnView(returnTo)
    setDetailLoading(true)
    setDetailTab(tab)
    navigateSiteView("detalle")
    try {
      await loadPhotoDetail(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar foto")
      navigateSiteView(returnTo)
    } finally {
      setDetailLoading(false)
    }
  }

  function onNotesSaved(updated: AssessmentDetail) {
    setPhotoDetail(updated)
    if (lastUpload?.id === updated.id) {
      setLastUpload(updated)
    }
    setAssessments((prev) =>
      prev.map((a) =>
        a.id === updated.id ? { ...a, has_professional_notes: updated.has_professional_notes } : a,
      ),
    )
  }

  async function handleCapture(file: File) {
    setError(null)
    setUploadingCount((c) => c + 1)
    try {
      let sessionId = activeSession?.id
      if (!sessionId) {
        const ws = await sessionsApi.createSession(sid)
        setActiveSession(ws)
        sessionId = ws.id
      }
      const queued = await assessmentsApi.uploadAssessment(sessionId, file)
      setWatchIds((prev) => [...prev, queued.assessment_id])
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la evidencia")
    } finally {
      setUploadingCount((c) => Math.max(0, c - 1))
    }
  }

  async function closeActiveSession() {
    if (!activeSession) {
      return
    }
    if (!window.confirm(`¿Cerrar la sesión #${activeSession.id}? Podrás abrir otra al capturar evidencia.`)) {
      return
    }
    setError(null)
    setBusy(true)
    try {
      await sessionsApi.endSession(activeSession.id)
      setActiveSession(null)
      if (galleryFilterMode === "active") {
        setGalleryFilterMode("all")
      }
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setBusy(false)
    }
  }

  async function deleteSessionById(sessionId: number) {
    const s = sessions.find((x) => x.id === sessionId)
    const label = s ? `Sesión #${sessionId}` : "esta Sesión"
    const extra =
      s && (s.assessment_count ?? 0) > 0
        ? ` Se borrarán ${s.assessment_count} foto(s) e informes asociados.`
        : ""
    if (!window.confirm(`¿Eliminar ${label}?${extra} Esta acción no se puede deshacer.`)) {
      return
    }
    setError(null)
    setBusy(true)
    try {
      await sessionsApi.deleteSession(sessionId)
      if (activeSession?.id === sessionId) {
        setActiveSession(null)
      }
      if (galleryPickedSessionId === sessionId) {
        setGalleryPickedSessionId(null)
        setGalleryFilterMode("all")
      }
      if (photoDetail && assessments.some((a) => a.session_id === sessionId && a.id === photoDetail.id)) {
        setPhotoDetail(null)
        navigateSiteView("expediente")
      }
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar")
    } finally {
      setBusy(false)
    }
  }

  async function startNewSession() {
    if (activeSession) {
      const ok = window.confirm(
        `Tienes la sesión #${activeSession.id} abierta. ¿Cerrarla y crear una nueva?`,
      )
      if (!ok) {
        return
      }
      setBusy(true)
      try {
        await sessionsApi.endSession(activeSession.id)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cerrar Sesión")
        setBusy(false)
        return
      }
    }
    setError(null)
    setBusy(true)
    try {
      const ws = await sessionsApi.createSession(sid)
      setActiveSession(ws)
      setSessionsSheetOpen(false)
      navigateSiteView("campo")
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setBusy(false)
    }
  }

  function openSessionInGallery(sessionId: number) {
    setGalleryPickedSessionId(sessionId)
    setGalleryFilterMode("picked")
    setSessionsSheetOpen(false)
    navigateSiteView("expediente")
  }

  function buildSiteTechnicalSections(): TechnicalSection[] {
    const bySession = sessions.map((s) => {
      const st = sessionStatsFromSession(s)
      return {
        label: `Sesión #${s.id}${s.end_time ? " (cerrada)" : " (abierta)"}`,
        value:
          st.avg != null ? `${formatScore100(st.avg)} · ${st.count} foto${st.count === 1 ? "" : "s"}` : "Sin fotos",
      }
    })
    return [
      {
        title: "Agregado de la sede",
        rows: [
          { label: "Sede", value: site?.name ?? "—" },
          { label: "Total sesiones", value: String(sessions.length) },
          { label: "Total fotos", value: String(siteScore.count) },
          { label: "Puntuación media ergonómica", value: siteScore.avg != null ? formatScore100(siteScore.avg) : "—" },
          {
            label: "Media orden y aseo",
            value: siteOrdenAvg != null ? formatScore100(siteOrdenAvg) : "—",
          },
          {
            label: "Rango ergonómico",
            value:
              siteScore.min != null && siteScore.max != null
                ? `${formatScore100(siteScore.min)} – ${formatScore100(siteScore.max)}`
                : "—",
          },
        ],
      },
      { title: "Desglose por Sesión", rows: bySession },
    ]
  }

  function buildSessionTechnicalSections(s: WorkSession): TechnicalSection[] {
    const photos = assessmentsForSession(assessments, s.id)
    const st = sessionStatsFromSession(s)
    return [
      {
        title: "Datos de la Sesión",
        rows: [
          { label: "Sesión", value: `#${s.id}` },
          { label: "Inicio", value: formatShortDate(s.start_time) },
          { label: "Fin", value: s.end_time ? formatShortDate(s.end_time) : "En curso" },
          { label: "Estado", value: s.end_time ? "Cerrada" : "Abierta" },
          { label: "Fotos", value: String(s.assessment_count ?? photos.length) },
          { label: "Media ergonómica", value: st.avg != null ? formatScore100(st.avg) : "—" },
        ],
      },
      {
        title: "Fotos de esta Sesión",
        rows: photos.map((p, i) => ({
          label: `Foto ${i + 1}`,
          value: `${formatScore100(p.calculated_score)} — ${p.primary_issue}`,
        })),
      },
    ]
  }

  if (!Number.isFinite(sid)) {
    return (
      <div className="page-pad">
        <p className="form-error">Sede no válida.</p>
        <Link to="/app">Volver</Link>
      </div>
    )
  }

  if (loading && !site) {
    return (
      <div className="page-pad">
        <LoadingBlock label="Cargando sede…" />
      </div>
    )
  }

  if (!site) {
    return (
      <div className="page-pad">
        <p className="form-error">No encontramos esta sede.</p>
        <Link to="/app">Volver</Link>
      </div>
    )
  }

  const showActionBar = siteView === "campo" || siteView === "expediente"
  const layoutCls = [
    "inspector-mission-layout",
    showActionBar && "inspector-mission-layout--dock",
    siteView === "detalle" && "inspector-mission-layout--detail",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={layoutCls}>
      <div className="inspector-mission-body inspector-site-shell page-pad view-enter">
      <p className="breadcrumb breadcrumb-in-header">
        <Link to="/app">Sedes</Link>
        {siteView !== "campo" && (
          <>
            {" / "}
            <button type="button" className="linkish" onClick={() => navigateSiteView("campo")}>
              {site.name}
            </button>
          </>
        )}
        {siteView === "campo" && <> / <span>{site.name}</span></>}
        {siteView === "expediente" && <> / <span>Expediente</span></>}
        {siteView === "detalle" && photoDetail && <> / <span>Informe #{photoDetail.id}</span></>}
      </p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="inspector-view-stage">
      {siteView === "campo" && (
        <InspectorViewPanel key="view-campo" motion={viewMotionDir}>
          <SiteSummaryCard
            site={site}
            siteScore={siteScore}
            ordenAvg={siteOrdenAvg}
            activeSession={activeSession}
            busy={busy || refreshing}
            sessionCount={sessions.length}
            onOpenSessions={() => setSessionsSheetOpen(true)}
            onRefresh={() => void handleRefresh()}
            onTechnicalSite={siteScore.count > 0 ? () => setSiteTechOpen(true) : undefined}
            onCloseSession={() => void closeActiveSession()}
          />

          <ProcessingQueuePanel items={processingQueue} />

          {showPostCapture && lastUpload && lastUpload.processing_status === "completed" && (
            <section className="post-capture-block view-panel-enter" aria-live="polite">
              <LootResultCard detail={lastUpload}>
                <ProfessionalNotesPanel
                  assessmentId={lastUpload.id}
                  detail={lastUpload}
                  onSaved={onNotesSaved}
                  mode="inspector"
                />
              </LootResultCard>
              <div className="post-capture-actions">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    setShowPostCapture(false)
                    captureInputRef.current?.click()
                  }}
                  disabled={busy}
                >
                  + Otra evidencia
                </button>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => void openPhotoDetail(lastUpload.id, "resumen", "campo")}
                >
                  Ver detalle
                </button>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => {
                    setShowPostCapture(false)
                    setGalleryPickedSessionId(activeSession?.id ?? null)
                    setGalleryFilterMode(activeSession ? "picked" : "all")
                    navigateSiteView("expediente")
                  }}
                >
                  Expediente
                </button>
                <button type="button" className="btn ghost sm" onClick={() => setShowPostCapture(false)}>
                  Ocultar
                </button>
              </div>
            </section>
          )}

          {!showPostCapture && latestPhoto && (
            <LastEvidenceTeaser photo={latestPhoto} onOpen={() => void openPhotoDetail(latestPhoto.id, "resumen", "campo")} />
          )}

          {!showPostCapture && !latestPhoto && (
            <p className="inspector-empty-campo muted">
              Aún no hay fotos en esta sede. Usa <strong>Capturar foto</strong> abajo. Encuadra el puesto con buena
              luz.
            </p>
          )}
        </InspectorViewPanel>
      )}

      {siteView === "expediente" && (
        <InspectorViewPanel key="view-expediente" motion={viewMotionDir} className="evidence-expediente-wrap">
          <header className="evidence-expediente-head">
            <h2 className="evidence-expediente-title">Expediente</h2>
            <div className="evidence-expediente-head-actions">
              <button type="button" className="btn ghost sm" onClick={() => setSessionsSheetOpen(true)}>
                Sesiones
              </button>
            </div>
          </header>
          <EvidenceGallery
            photos={galleryPhotos}
            filterMode={galleryPickedSessionId != null ? "picked" : galleryFilterMode}
            activeSession={activeSession}
            pickedSessionId={galleryPickedSessionId}
            pickedSessionLabel={pickedSession ? `Sesión #${pickedSession.id}` : undefined}
            onFilterChange={setGalleryFilterMode}
            onClearPickedSession={() => {
              setGalleryPickedSessionId(null)
              setGalleryFilterMode("all")
            }}
            onSelectPhoto={(id) => void openPhotoDetail(id, "resumen", "expediente")}
          />
        </InspectorViewPanel>
      )}
      </div>
      </div>

      {siteView === "detalle" && (
        <EvidenceDetailSheet
          open
          onClose={() => navigateSiteView(detailReturnView)}
          title={photoDetail ? `Informe #${photoDetail.id}` : undefined}
        >
          {detailLoading || !photoDetail ? (
            <LoadingBlock label="Cargando informe…" />
          ) : (
            <EvidenceDetailView
              detail={photoDetail}
              tab={detailTab}
              onTabChange={setDetailTab}
              onBack={() => navigateSiteView(detailReturnView)}
              onNotesSaved={onNotesSaved}
            />
          )}
        </EvidenceDetailSheet>
      )}

      {showActionBar && (
        <InspectorActionBar
          busy={uploadingCount > 0}
          queueCount={processingQueue.length}
          activeMode={siteView === "expediente" ? "expediente" : "campo"}
          onModeChange={(mode) => {
            setShowPostCapture(false)
            navigateSiteView(mode)
          }}
          onCapture={(file) => void handleCapture(file)}
        />
      )}

      <input
        ref={captureInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        className="sr-only"
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            void handleCapture(file)
          }
          e.target.value = ""
        }}
      />

      <SessionManagerSheet
        open={sessionsSheetOpen}
        sessions={sessions}
        activeSession={activeSession}
        busy={busy}
        onClose={() => setSessionsSheetOpen(false)}
        onSelectSession={openSessionInGallery}
        onDeleteSession={(id) => void deleteSessionById(id)}
        onNewSession={() => void startNewSession()}
        onSessionTechnical={(s) => setSessionTechTarget(s)}
      />

      <TechnicalModal
        open={siteTechOpen}
        title="Detalle técnico · Sede"
        subtitle="Agregados e historial por sesión"
        sections={buildSiteTechnicalSections()}
        onClose={() => setSiteTechOpen(false)}
      />

      <TechnicalModal
        open={sessionTechTarget != null}
        title={sessionTechTarget ? `Detalle técnico · Sesión #${sessionTechTarget.id}` : ""}
        subtitle="Datos agregados de la Sesión"
        sections={sessionTechTarget ? buildSessionTechnicalSections(sessionTechTarget) : []}
        onClose={() => setSessionTechTarget(null)}
      />
    </div>
  )
}



