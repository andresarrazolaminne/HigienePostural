import type { AssessmentListItem } from "../../api/types"
import { EvidenceThumb } from "../inspector/EvidenceThumb"

type Props = {
  photos: AssessmentListItem[]
  onSelectPhoto: (id: number) => void
  printMode?: boolean
}

export function SiteReportEvidenceSection({ photos, onSelectPhoto, printMode }: Props) {
  const shown = printMode ? photos.slice(0, 6) : photos

  return (
    <section className="site-report-section site-report-evidence">
      <h3 className="site-report-section-title">
        {printMode ? "Evidencias recientes (muestra)" : "Evidencias recientes"}
      </h3>
      {shown.length === 0 ? (
        <p className="muted small">Sin fotos.</p>
      ) : (
        <div className="evidence-gallery-grid">
          {shown.map((p) => (
            <EvidenceThumb key={p.id} photo={p} lazy onSelect={() => onSelectPhoto(p.id)} />
          ))}
        </div>
      )}
      {printMode && photos.length > 6 && (
        <p className="muted small site-report-print-note">
          +{photos.length - 6} evidencias más en la versión web.
        </p>
      )}
    </section>
  )
}
