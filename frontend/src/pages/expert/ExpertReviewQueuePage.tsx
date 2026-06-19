import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import * as assessmentsApi from "../../api/assessments"
import * as companiesApi from "../../api/companies"
import type { AssessmentReviewQueueItem, Company } from "../../api/types"
import { PageHeader } from "../../components/ui/PageHeader"
import { Panel } from "../../components/ui/Panel"
import { LoadingBlock } from "../../components/ui/LoadingBlock"
import { formatShortDate } from "../../lib/aggregates"
import { formatScore100 } from "../../lib/score"

export function ExpertReviewQueuePage() {
  const [items, setItems] = useState<AssessmentReviewQueueItem[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyFilter, setCompanyFilter] = useState<number | "">("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const q = await assessmentsApi.getReviewQueue({
      status: "pending",
      company_id: companyFilter === "" ? undefined : companyFilter,
    })
    setItems(q)
  }, [companyFilter])

  useEffect(() => {
    void companiesApi.listAssignedCompanies().then(setCompanies).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    void load()
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [load])

  return (
    <div className="page-pad">
      <PageHeader
        kicker="Validación humana"
        title="Cola de revisión"
        lead="Revisa y corrige los informes generados por IA antes de que queden como resultado oficial."
      />
      {error && <p className="form-error">{error}</p>}

      <Panel title="Filtros">
        <label className="grid-form">
          Empresa
          <select
            value={companyFilter === "" ? "" : String(companyFilter)}
            onChange={(e) => setCompanyFilter(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">Todas las asignadas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </Panel>

      {loading ? (
        <LoadingBlock label="Cargando cola…" />
      ) : items.length === 0 ? (
        <div className="expert-mission-strip expert-mission-strip--clear" role="status">
          <span className="expert-mission-icon" aria-hidden>
            ✅
          </span>
          <div>
            <strong className="expert-mission-title">Cola despejada</strong>
            <p className="muted small">No hay informes pendientes de validación. ¡Buen trabajo!</p>
          </div>
        </div>
      ) : (
        <>
          <div className="expert-mission-strip" role="status">
            <span className="expert-mission-icon" aria-hidden>
              🎯
            </span>
            <div className="expert-mission-text">
              <strong className="expert-mission-title">
                {items.length} misión{items.length === 1 ? "" : "es"} de revisión
              </strong>
              <p className="muted small">Valida cada informe para confirmarlo como resultado oficial.</p>
            </div>
            <span className="expert-mission-count">{items.length}</span>
          </div>
          <ul className="expert-queue-list">
          {items.map((item) => (
            <li key={item.id} className="expert-queue-item panel">
              <div className="expert-queue-meta">
                <strong>#{item.id}</strong>
                <span className="muted small">
                  {item.company_name ?? "—"} · {item.site_name ?? "Sede"}
                </span>
                <span className="muted small">
                  Inspector: {item.inspector_name ?? "—"} · {formatShortDate(item.created_at)}
                </span>
              </div>
              <div className="expert-queue-scores">
                <span>IA: {formatScore100(item.ai_calculated_score)}</span>
                <p className="small">{item.ai_primary_issue}</p>
              </div>
              <Link to={`/experto/revisar/${item.id}`} className="btn primary sm">
                Revisar
              </Link>
            </li>
          ))}
          </ul>
        </>
      )}
    </div>
  )
}
