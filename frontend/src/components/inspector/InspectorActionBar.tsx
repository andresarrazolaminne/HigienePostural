import { useRef } from "react"
import { IconCamera, IconField, IconFolder } from "../icons/InspectorActionIcons"

export type InspectorWorkMode = "campo" | "expediente"

type Props = {
  busy?: boolean
  queueCount?: number
  activeMode: InspectorWorkMode
  onModeChange: (mode: InspectorWorkMode) => void
  onCapture: (file: File) => void
}

export function InspectorActionBar({
  busy,
  queueCount = 0,
  activeMode,
  onModeChange,
  onCapture,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      onCapture(file)
    }
    e.target.value = ""
  }

  const captureAria = busy
    ? "Subiendo evidencia"
    : queueCount > 0
      ? `Capturar foto, ${queueCount} en cola`
      : "Capturar foto del puesto"

  return (
    <div className="inspector-dock" role="region" aria-label="Acciones de inspección en sede">
      <section className="inspector-dock-mode" aria-labelledby="inspector-mode-label">
        <span className="inspector-dock-mode-label" id="inspector-mode-label">
          Cambiar vista
        </span>
        <div
          className="inspector-mode-segmented"
          role="tablist"
          aria-label="Vista Campo o Expediente"
        >
          <button
            type="button"
            role="tab"
            className={`inspector-mode-tab${activeMode === "campo" ? " is-active" : ""}`}
            aria-selected={activeMode === "campo"}
            disabled={busy}
            onClick={() => onModeChange("campo")}
          >
            <IconField className="inspector-mode-tab-icon" aria-hidden />
            <span>Campo</span>
          </button>
          <button
            type="button"
            role="tab"
            className={`inspector-mode-tab${activeMode === "expediente" ? " is-active" : ""}`}
            aria-selected={activeMode === "expediente"}
            disabled={busy}
            onClick={() => onModeChange("expediente")}
          >
            <IconFolder className="inspector-mode-tab-icon" aria-hidden />
            <span>Expediente</span>
          </button>
        </div>
      </section>

      <div className="inspector-dock-divider" role="separator" aria-hidden />

      <section className="inspector-dock-capture-block" aria-labelledby="inspector-capture-label">
        <span className="inspector-dock-capture-label" id="inspector-capture-label">
          Capturar evidencia
        </span>
        <button
          type="button"
          className="inspector-dock-capture btn primary btn-lg"
          disabled={busy}
          aria-label={captureAria}
          onClick={() => inputRef.current?.click()}
        >
          <IconCamera className="inspector-dock-capture-icon" aria-hidden />
          <span>{busy ? "Subiendo…" : "Capturar foto"}</span>
          {queueCount > 0 && !busy && (
            <span className="inspector-dock-capture-badge" aria-hidden>
              {queueCount}
            </span>
          )}
        </button>
      </section>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        className="sr-only"
        aria-hidden
        onChange={onFileChange}
      />
    </div>
  )
}
