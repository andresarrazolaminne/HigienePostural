import { APP_NAME } from "../../config/branding"
import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import { useReactToPrint } from "react-to-print"
import * as assessmentsApi from "../../api/assessments"
import * as reportsApi from "../../api/reports"
import type { AssessmentDetail, SiteReport } from "../../api/types"
import { EvidenceDetailView, type DetailTab } from "../../components/inspector/EvidenceDetailView"
import { EvidenceDetailSheet } from "../../components/inspector/EvidenceDetailSheet"
import { SiteReportActionList } from "../../components/reports/SiteReportActionList"
import { SiteReportEvidenceSection } from "../../components/reports/SiteReportEvidenceSection"
import { SiteReportFactorBars } from "../../components/reports/SiteReportFactorBars"
import { SiteReportIssueTable } from "../../components/reports/SiteReportIssueTable"
import { SiteReportKpiStrip } from "../../components/reports/SiteReportKpiStrip"
import { SiteReportScoreChart } from "../../components/reports/SiteReportScoreChart"
import { SiteReportSessionsTimeline } from "../../components/reports/SiteReportSessionsTimeline"
import { LoadingBlock } from "../../components/ui/LoadingBlock"
import { scoreToRank } from "../../lib/gameRank"
import { formatDateOnly } from "../../lib/aggregates"
import "../../site-report.css"

function formatPeriod(iso: string | null): string {
  if (!iso) return "—"
  try {
    return formatDateOnly(iso)
  } catch {
    return iso
  }
}

export function SiteReportPage() {
  const { siteId } = useParams()
  const sid = Number(siteId)
  const location = useLocation()
  const isAdmin = location.pathname.startsWith("/admin")
  const sitesBase = isAdmin ? "/admin/sedes" : "/empresa/sedes"

  const [report, setReport] = useState<SiteReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [photoDetail, setPhotoDetail] = useState<AssessmentDetail | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>("resumen")
  const [detailLoading, setDetailLoading] = useState(false)
  const [printing, setPrinting] = useState(false)

  const printRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!Number.isFinite(sid)) return
    setError(null)
    const data = await reportsApi.getSiteReport(sid)
    setReport(data)
  }, [sid])

  useEffect(() => {
    setLoading(true)
    void load()
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [load])

  async function openAssessment(id: number) {
    setDetailLoading(true)
    setDetailTab("resumen")
    try {
      setPhotoDetail(await assessmentsApi.getAssessment(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar evidencia")
    } finally {
      setDetailLoading(false)
    }
  }

  function onNotesSaved(updated: AssessmentDetail) {
    setPhotoDetail(updated)
    setReport((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        recent_assessments: prev.recent_assessments.map((a) =>
          a.id === updated.id ? { ...a, has_professional_notes: updated.has_professional_notes } : a,
        ),
      }
    })
    void load().catch(() => {})
  }

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: report ? `Informe-${report.site.name}` : "Informe-sede",
    onBeforePrint: () => {
      setPrinting(true)
      return Promise.resolve()
    },
    onAfterPrint: () => setPrinting(false),
  })

  if (!Number.isFinite(sid)) {
    return (
      <div className="page-pad">
        <p className="form-error">Sede no válida.</p>
        <Link to={sitesBase}>Volver</Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page-pad">
        <LoadingBlock label="Generando informe de sede…" />
      </div>
    )
  }

  if (error && !report) {
    return (
      <div className="page-pad">
        <p className="form-error">{error}</p>
        <Link to={sitesBase}>Volver a sedes</Link>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="page-pad">
        <p className="muted">No hay datos para esta sede.</p>
        <Link to={sitesBase}>Volver</Link>
      </div>
    )
  }

  const rank = scoreToRank(report.ergonomics.stats.avg)
  const generatedAt = new Date().toLocaleString("es", { dateStyle: "long", timeStyle: "short" })

  return (
    <div className={`page-pad site-report-page ${printing ? "site-report--printing" : ""}`}>
      <header className="site-report-toolbar no-print">
        <p className="breadcrumb breadcrumb-in-header">
          {isAdmin ? (
            <>
              <Link to="/admin/sedes">Sedes</Link> / <span>{report.site.company_name}</span> /{" "}
            </>
          ) : (
            <Link to="/empresa/sedes">Sedes</Link>
          )}
          <span>{report.site.name}</span> / <span>Informe</span>
        </p>
        <div className="site-report-toolbar-actions">
          <Link to={sitesBase} className="btn ghost sm">
            ← Volver
          </Link>
          <button type="button" className="btn primary sm" onClick={() => void handlePrint()}>
            Exportar PDF
          </button>
        </div>
      </header>

      {error && (
        <p className="form-error no-print" role="alert">
          {error}
        </p>
      )}

      <div id="site-report-print" ref={printRef} className="site-report-document">
        <header className="site-report-cover">
          <p className="site-report-cover-kicker">Informe HSEQ · {APP_NAME}</p>
          <h1 className="site-report-cover-title">{report.site.name}</h1>
          {report.site.address && <p className="site-report-cover-address">{report.site.address}</p>}
          <p className="muted small">
            {report.site.company_name}
            {report.period.first_assessment_at && (
              <>
                {" "}
                · Período {formatPeriod(report.period.first_assessment_at)} —{" "}
                {formatPeriod(report.period.last_assessment_at)}
              </>
            )}
          </p>
          <div className={`site-report-risk-badge site-report-risk-badge--${rank.tone}`}>
            <span className="site-report-risk-label">Nivel de riesgo ergonómico</span>
            <span className="site-report-risk-value">{rank.title}</span>
            <span className="muted small">{rank.subtitle}</span>
          </div>
          <p className="site-report-generated muted small">Generado el {generatedAt}</p>
        </header>

        <SiteReportKpiStrip report={report} />

        <SiteReportIssueTable
          title="Hallazgos ergonómicos recurrentes"
          issues={report.top_ergonomic_issues}
          scoreLabel="Peor score"
          onViewAssessment={(id) => void openAssessment(id)}
        />

        <SiteReportIssueTable
          title="Hallazgos de orden y aseo"
          issues={report.top_orden_issues}
          scoreLabel="Peor score"
          onViewAssessment={(id) => void openAssessment(id)}
        />

        <div className="site-report-two-col">
          <SiteReportScoreChart
            title="Distribución riesgo ergonómico"
            buckets={report.ergonomics.distribution}
            total={report.ergonomics.stats.count}
            variant="risk"
          />
          <SiteReportScoreChart
            title="Distribución orden y aseo"
            buckets={report.orden_aseo.distribution}
            total={report.orden_aseo.stats.count}
            variant="orden"
          />
        </div>

        <SiteReportFactorBars
          title="Factores ergonómicos detectados"
          counts={report.ergonomics.factor_counts}
          total={report.assessment_count}
          kind="ergonomic"
        />

        <SiteReportFactorBars
          title="Incidencias orden/aseo (moderado o severo)"
          counts={report.orden_aseo.severity_flag_counts}
          total={report.assessment_count}
          kind="orden"
        />

        <SiteReportActionList items={report.action_items} onViewAssessment={(id) => void openAssessment(id)} />

        <SiteReportSessionsTimeline sessions={report.sessions_summary} />

        <SiteReportEvidenceSection
          photos={report.recent_assessments}
          printMode={printing}
          onSelectPhoto={(id) => void openAssessment(id)}
        />
      </div>

      {photoDetail && (
        <EvidenceDetailSheet open onClose={() => setPhotoDetail(null)}>
          {detailLoading ? (
            <LoadingBlock label="Cargando…" />
          ) : (
            <EvidenceDetailView
              detail={photoDetail}
              tab={detailTab}
              onTabChange={setDetailTab}
              onBack={() => setPhotoDetail(null)}
              onNotesSaved={onNotesSaved}
            />
          )}
        </EvidenceDetailSheet>
      )}
    </div>
  )
}

