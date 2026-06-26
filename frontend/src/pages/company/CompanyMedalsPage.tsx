import { LoadingBlock } from "../../components/ui/LoadingBlock"
import { PageHeader } from "../../components/ui/PageHeader"
import { Panel } from "../../components/ui/Panel"
import { MedalGrid } from "../../components/game/MedalGrid"
import { useCompanyGamification } from "../../lib/useCompanyGamification"

export function CompanyMedalsPage() {
  const { loading, error, medals } = useCompanyGamification()
  const earned = medals.filter((m) => m.earned).length

  if (loading) {
    return (
      <div className="page-pad">
        <LoadingBlock label="Cargando medallas…" />
      </div>
    )
  }

  return (
    <div className="page-pad">
      <PageHeader
        kicker="Progreso"
        title="Medallas"
        lead="Reconocimientos por la madurez del programa de higiene postural."
      />

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <p className="medals-page-summary">
        El programa ha obtenido <strong>{earned}</strong> de <strong>{medals.length}</strong> medallas.
      </p>

      <Panel title="Medallas del programa" subtitle="Obtenidas y pendientes según cobertura, evidencias y validación.">
        <MedalGrid medals={medals} grouped />
      </Panel>
    </div>
  )
}
