import { ordenAseoSummaryRows, visionSummaryRows } from "../lib/visionLabels"

export type TechnicalSection = {
  title: string
  rows: { label: string; value: string }[]
  json?: Record<string, unknown> | null
}

type Props = {
  open: boolean
  title: string
  subtitle?: string
  sections: TechnicalSection[]
  onClose: () => void
}

export function TechnicalSectionsBody({ sections }: { sections: TechnicalSection[] }) {
  return (
    <>
      {sections.map((sec) => (
        <section key={sec.title} className="technical-section">
          <h4>{sec.title}</h4>
          {sec.rows.length > 0 ? (
            <dl className="vision-dl">
              {sec.rows.map((row) => (
                <div key={row.label} className="vision-dl-row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="muted small">Sin datos adicionales.</p>
          )}
          {sec.json && Object.keys(sec.json).length > 0 && (
            <details className="technical-json-block">
              <summary>JSON completo (IA)</summary>
              <pre className="json-pre json-pre-tight">{JSON.stringify(sec.json, null, 2)}</pre>
            </details>
          )}
        </section>
      ))}
    </>
  )
}

export function TechnicalModal({ open, title, subtitle, sections, onClose }: Props) {
  if (!open) {
    return null
  }

  return (
    <div className="modal-back" role="presentation" onClick={onClose}>
      <div className="modal modal--wide technical-modal" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p className="muted small technical-modal-sub">{subtitle}</p>}
          </div>
          <button type="button" className="btn ghost sm" onClick={onClose}>
            Cerrar
          </button>
        </header>
        <div className="modal-body">
          <TechnicalSectionsBody sections={sections} />
        </div>
      </div>
    </div>
  )
}

export function photoTechnicalSection(detail: {
  id: number
  calculated_score: number
  primary_issue: string
  created_at: string
  raw_ai_json: Record<string, unknown>
  orden_aseo_score?: number | null
}): TechnicalSection[] {
  const ordenRows = ordenAseoSummaryRows(detail.raw_ai_json)
  const sections: TechnicalSection[] = [
    {
      title: "Resumen de la foto",
      rows: [
        { label: "Informe #", value: String(detail.id) },
        { label: "Puntuación ergonómica", value: `${Math.round(detail.calculated_score)}/100` },
        {
          label: "Puntuación orden y aseo",
          value:
            detail.orden_aseo_score != null && Number.isFinite(detail.orden_aseo_score)
              ? `${Math.round(detail.orden_aseo_score)}/100`
              : "No disponible",
        },
        { label: "Fecha", value: detail.created_at },
        { label: "Hallazgo ergonómico", value: detail.primary_issue },
      ],
    },
    {
      title: "Análisis ergonómico (IA)",
      rows: visionSummaryRows(detail.raw_ai_json),
    },
  ]
  if (ordenRows.length > 0) {
    sections.push({
      title: "Orden y aseo (IA)",
      rows: ordenRows,
    })
  }
  sections.push({
    title: "JSON completo",
    rows: [],
    json: detail.raw_ai_json,
  })
  return sections
}
