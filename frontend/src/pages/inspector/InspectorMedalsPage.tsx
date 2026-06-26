import { LoadingBlock } from "../../components/ui/LoadingBlock"
import { PageHeader } from "../../components/ui/PageHeader"
import { Panel } from "../../components/ui/Panel"
import { MedalGrid } from "../../components/game/MedalGrid"
import { useInspectorGamification } from "../../lib/useInspectorGamification"

export function InspectorMedalsPage() {
  const { loading, error, medals } = useInspectorGamification()
  const earned = medals.filter((m) => m.earned).length

  if (loading) {
    return (
      <div className="page-pad view-enter">
        <LoadingBlock label="Cargando medallas…" />
      </div>
    )
  }

  return (
    <div className="page-pad view-enter">
      <PageHeader
        kicker="Progreso"
        title="Medallas"
        lead="Reconocimientos por tu actividad de inspección en campo."
      />

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <p className="medals-page-summary">
        Has obtenido <strong>{earned}</strong> de <strong>{medals.length}</strong> medallas.
      </p>

      <Panel title="Tu colección" subtitle="Medallas obtenidas y pendientes según tu historial.">
        <MedalGrid medals={medals} grouped />
      </Panel>
    </div>
  )
}
