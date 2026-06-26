import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import * as companiesApi from "../../api/companies"
import * as sessionsApi from "../../api/sessions"
import * as usersApi from "../../api/users"
import { LoadingBlock } from "../../components/ui/LoadingBlock"
import { PageHeader } from "../../components/ui/PageHeader"
import { Panel } from "../../components/ui/Panel"
import { StepGuide } from "../../components/ui/StepGuide"
import type { Company } from "../../api/types"
import { siteStats } from "../../lib/aggregates"
import { formatScore100 } from "../../lib/score"
import { scoreToRank } from "../../lib/gameRank"
import { LevelProgress } from "../../components/game/LevelProgress"
import { useCompanyGamification } from "../../lib/useCompanyGamification"

export function CompanyDashboardPage() {
  const {
    siteList,
    assessments,
    error: gamError,
    loading: gamLoading,
    avgScore,
    companyMetrics,
    programLevel,
  } = useCompanyGamification()

  const [company, setCompany] = useState<Company | null>(null)
  const [users, setUsers] = useState(0)
  const [sessions, setSessions] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [extraLoading, setExtraLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const [co, us, sess] = await Promise.all([
          companiesApi.getMyCompany(),
          usersApi.listUsers(),
          sessionsApi.listCompanySessions(),
        ])
        setCompany(co)
        setUsers(us.length)
        setSessions(sess.length)
      } catch (e) {
        setError(String(e))
      } finally {
        setExtraLoading(false)
      }
    })()
  }, [])

  const pendingReview = useMemo(
    () => assessments.filter((a) => !a.has_professional_notes).length,
    [assessments],
  )

  const siteRanking = useMemo(() => {
    return siteList
      .map((s) => {
        const st = siteStats(assessments, s.id)
        return { site: s, stats: st }
      })
      .filter((x) => x.stats.count > 0)
      .sort((a, b) => (b.stats.avg ?? 0) - (a.stats.avg ?? 0))
  }, [siteList, assessments])

  const worstSites = siteRanking.slice(0, 5)
  const loading = gamLoading || extraLoading
  const displayError = error ?? gamError

  if (loading) {
    return (
      <div className="page-pad">
        <LoadingBlock label="Cargando panel…" />
      </div>
    )
  }

  return (
    <div className="page-pad">
      <PageHeader
        kicker="Administración HSEQ"
        title={company?.name ?? "Mi empresa"}
        lead="Supervisa sedes, equipo e informes ergonómicos de tus inspectores."
      />

      {displayError && <p className="form-error" role="alert">{displayError}</p>}

      {pendingReview > 0 && (
        <div className="alert-banner alert-banner-warn" role="status">
          <strong>{pendingReview}</strong> informe{pendingReview === 1 ? "" : "s"} sin revisión profesional.{" "}
          <Link to="/empresa/informes">Revisar ahora →</Link>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{siteList.length}</span>
          <span className="stat-label">Sedes</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{users}</span>
          <span className="stat-label">Usuarios</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{sessions}</span>
          <span className="stat-label">Sesiones</span>
        </div>
        <div className="stat-card stat-card-highlight">
          <span className="stat-value">{avgScore != null ? formatScore100(avgScore) : "—"}</span>
          <span className="stat-label">Media ergonómica</span>
        </div>
      </div>

      <Panel
        title="Madurez del programa"
        subtitle="Progreso del programa de higiene postural según cobertura, evidencias y validación experta."
      >
        <div className="program-progress-block">
          <LevelProgress
            level={programLevel}
            roleLabel="Programa HSEQ"
            meta={`${companyMetrics.coveredSites}/${Math.max(companyMetrics.totalSites, 1)} sedes · ${companyMetrics.reviewed} revisado${companyMetrics.reviewed === 1 ? "" : "s"}`}
            compact
          />
        </div>
      </Panel>

      {worstSites.length > 0 && (
        <Panel title="Sedes que requieren atención" subtitle="Mayor riesgo ergonómico medio (peor primero).">
          <ul className="site-ranking-list">
            {worstSites.map(({ site, stats }) => {
              const rank = scoreToRank(stats.avg)
              return (
                <li key={site.id} className="site-ranking-item">
                  <div className="site-ranking-meta">
                    <strong>{site.name}</strong>
                    <span className={`score-chip score-chip-${rank.tone}`}>
                      {formatScore100(stats.avg)}
                    </span>
                    <span className="muted small">
                      {rank.title} · {stats.count} foto
                      {stats.count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <Link to={`/empresa/sedes/${site.id}/informe`} className="btn primary sm">
                    Informe detallado
                  </Link>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      <StepGuide
        title="Tu flujo como profesional"
        steps={[
          { n: 1, title: "Configura sedes", text: "Crea las ubicaciones donde inspeccionan tus equipos." },
          { n: 2, title: "Invita inspectores", text: "Alta de usuarios con rol inspector." },
          { n: 3, title: "Revisa informes", text: "Abre el informe por sede o valida cada foto." },
        ]}
      />

      <Panel title="Acciones rápidas">
        <div className="row-actions wrap">
          <Link to="/empresa/sedes" className="btn secondary">
            Gestionar sedes
          </Link>
          <Link to="/empresa/usuarios" className="btn secondary">
            Gestionar equipo
          </Link>
          <Link to="/empresa/informes" className="btn primary">
            Ver informes
          </Link>
        </div>
      </Panel>
    </div>
  )
}
