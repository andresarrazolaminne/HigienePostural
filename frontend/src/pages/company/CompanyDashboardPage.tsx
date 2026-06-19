import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import * as assessmentsApi from "../../api/assessments"
import * as companiesApi from "../../api/companies"
import * as sessionsApi from "../../api/sessions"
import * as sitesApi from "../../api/sites"
import * as usersApi from "../../api/users"
import { LoadingBlock } from "../../components/ui/LoadingBlock"
import { PageHeader } from "../../components/ui/PageHeader"
import { Panel } from "../../components/ui/Panel"
import { StepGuide } from "../../components/ui/StepGuide"
import type { AssessmentListItem, Company, Site } from "../../api/types"
import { siteStats } from "../../lib/aggregates"
import { formatScore100 } from "../../lib/score"
import { scoreToRank } from "../../lib/gameRank"
import {
  companyXp,
  companyAchievements,
  levelFromXp,
  COMPANY_TITLES,
  type CompanyMetrics,
} from "../../lib/gamification"
import { LevelProgress } from "../../components/game/LevelProgress"
import { AchievementBadges } from "../../components/game/AchievementBadges"

export function CompanyDashboardPage() {
  const [company, setCompany] = useState<Company | null>(null)
  const [siteList, setSiteList] = useState<Site[]>([])
  const [users, setUsers] = useState(0)
  const [sessions, setSessions] = useState(0)
  const [assessments, setAssessments] = useState<AssessmentListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const [co, st, us, sess, asm] = await Promise.all([
          companiesApi.getMyCompany(),
          sitesApi.listSites(),
          usersApi.listUsers(),
          sessionsApi.listCompanySessions(),
          assessmentsApi.listCompanyAssessments(),
        ])
        setCompany(co)
        setSiteList(st)
        setUsers(us.length)
        setSessions(sess.length)
        setAssessments(asm)
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const avgScore = useMemo(() => {
    const completed = assessments.filter(
      (a) => a.processing_status === "completed" && a.calculated_score != null,
    )
    if (completed.length === 0) {
      return null
    }
    const sum = completed.reduce((a, b) => a + (b.calculated_score as number), 0)
    return sum / completed.length
  }, [assessments])

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

  const companyMetrics = useMemo<CompanyMetrics>(() => {
    const completedItems = assessments.filter(
      (a) => a.processing_status === "completed" && a.calculated_score != null,
    )
    const coveredSites = new Set(completedItems.map((a) => a.site_id)).size
    const reviewed = assessments.filter((a) => a.has_professional_notes).length
    return {
      totalSites: siteList.length,
      coveredSites,
      completed: completedItems.length,
      reviewed,
      avgScore,
    }
  }, [assessments, siteList, avgScore])

  const programLevel = useMemo(
    () => levelFromXp(companyXp(companyMetrics), COMPANY_TITLES),
    [companyMetrics],
  )
  const programAchievements = useMemo(() => companyAchievements(companyMetrics), [companyMetrics])

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

      {error && <p className="form-error" role="alert">{error}</p>}

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
          />
          <AchievementBadges achievements={programAchievements} title="Hitos del programa" />
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
