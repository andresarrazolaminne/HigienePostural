import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { scoreToRank } from "../../lib/gameRank"
import { EmptyState } from "../../components/ui/EmptyState"
import { LoadingBlock } from "../../components/ui/LoadingBlock"
import { siteStats, statsFromScores } from "../../lib/aggregates"
import { formatScore100 } from "../../lib/score"
import { LevelProgress } from "../../components/game/LevelProgress"
import { useInspectorGamification } from "../../lib/useInspectorGamification"

export function InspectorHome() {
  const {
    sites,
    assessments,
    error,
    loading,
    loadData,
    metrics: inspectorMetrics,
    playerLevel,
  } = useInspectorGamification()
  const [query, setQuery] = useState("")
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    const ctrl = new AbortController()
    try {
      await loadData(ctrl.signal)
    } finally {
      setRefreshing(false)
    }
  }

  const statsBySite = useMemo(() => {
    const m = new Map<number, ReturnType<typeof siteStats>>()
    for (const s of sites) {
      m.set(s.id, siteStats(assessments, s.id))
    }
    return m
  }, [sites, assessments])

  const ordenAvgBySite = useMemo(() => {
    const m = new Map<number, number | null>()
    for (const s of sites) {
      const scores = assessments
        .filter((a) => a.site_id === s.id)
        .map((a) => a.orden_aseo_score)
        .filter((x): x is number => x != null && Number.isFinite(x))
      m.set(s.id, statsFromScores(scores).avg)
    }
    return m
  }, [sites, assessments])

  const filteredSites = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = [...sites].sort((a, b) => a.name.localeCompare(b.name, "es"))
    if (!q) return list
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.address?.toLowerCase().includes(q) ?? false),
    )
  }, [sites, query])

  const totalEvals = assessments.length

  if (loading && sites.length === 0 && !error) {
    return (
      <div className="page-pad view-enter">
        <LoadingBlock label="Cargando sedes..." />
      </div>
    )
  }

  return (
    <div className="page-pad inspector-home view-enter">
      <header className="inspector-home-head">
        <div>
          <h1 className="inspector-home-title">Sedes</h1>
          <p className="muted small">
            {sites.length} sede{sites.length === 1 ? "" : "s"}
            {totalEvals > 0 ? ` · ${totalEvals} informe${totalEvals === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <button
          type="button"
          className="btn ghost sm btn-3d inspector-refresh-btn"
          onClick={() => void handleRefresh()}
          disabled={refreshing}
          title="Actualizar listado"
          aria-label="Actualizar listado"
        >
          {refreshing ? "..." : "Actualizar"}
        </button>
      </header>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {sites.length > 0 && (
        <section className="inspector-progress-block">
          <LevelProgress
            level={playerLevel}
            roleLabel="Inspector de campo"
            meta={`${inspectorMetrics.completed} evidencia${inspectorMetrics.completed === 1 ? "" : "s"} · ${inspectorMetrics.sites} sede${inspectorMetrics.sites === 1 ? "" : "s"}`}
            compact
          />
        </section>
      )}

      {sites.length > 0 && (
        <label className="inspector-home-search">
          <span className="sr-only">Buscar sede</span>
          <input
            type="search"
            placeholder="Buscar por nombre o direccion..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      )}

      {sites.length === 0 ? (
        <EmptyState
          icon="!"
          title="Sin sedes asignadas"
          message={
            error
              ? "No pudimos cargar el listado. Pulsa Actualizar o espera unos segundos tras reiniciar Docker."
              : "Pide a tu administrador que registre una sede para empezar a inspeccionar."
          }
        />
      ) : filteredSites.length === 0 ? (
        <EmptyState icon="?" title="Sin resultados" message="Prueba otro termino de busqueda." />
      ) : (
        <section className="site-picker-section">
          <div className="site-picker-grid">
            {filteredSites.map((s, i) => {
              const st = statsBySite.get(s.id)
              const rank = scoreToRank(st?.avg ?? null)
              const ordenAvg = ordenAvgBySite.get(s.id)

              return (
                <Link
                  key={s.id}
                  to={`/app/inspeccion/${s.id}`}
                  className="site-picker-card site-picker-card-clean card-3d view-panel-enter"
                  style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                >
                  <span className="site-picker-level">Sede</span>
                  <h3>{s.name}</h3>
                  {s.address && <p className="muted small site-picker-address">{s.address}</p>}
                  {st && st.count > 0 ? (
                    <div className="site-picker-stats-row">
                      <span className={`score-chip score-chip-lg score-chip-${rank.tone}`}>
                        Ergo {formatScore100(st.avg)}
                      </span>
                      <span className="muted small">
                        Orden {ordenAvg != null ? formatScore100(ordenAvg) : "-"}
                      </span>
                      <span className="muted small">
                        {st.count} foto{st.count === 1 ? "" : "s"}
                      </span>
                    </div>
                  ) : (
                    <span className="muted small site-picker-new">Sin inspecciones aun</span>
                  )}
                  <span className="site-picker-cta">Abrir sede</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
