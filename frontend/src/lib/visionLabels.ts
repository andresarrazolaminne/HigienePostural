const lumbar: Record<string, string> = {
  none: "Ninguno",
  partial: "Parcial",
  adequate: "Adecuado",
  not_observable: "No observable",
}

const wrist: Record<string, string> = {
  neutral: "Neutra",
  flexion_extension: "Flexión o extensión",
  ulnar_radial_deviation: "Desviación cubital o radial",
  not_observable: "No observable",
}

const monitor: Record<string, string> = {
  below_eye_level: "Por debajo de los ojos",
  at_eye_level: "A la altura de los ojos",
  above_eye_level: "Por encima de los ojos",
  not_observable: "No observable",
}

const confidence: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) {
    return "—"
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return String(v)
  }
  if (typeof v === "string") {
    return v
  }
  return JSON.stringify(v)
}

function mapEnum(table: Record<string, string>, v: unknown): string {
  if (typeof v !== "string") {
    return fmt(v)
  }
  return table[v] ?? v
}

/** Filas legibles en español a partir del JSON guardado por la IA. */
export function visionSummaryRows(raw: Record<string, unknown> | null | undefined): { label: string; value: string }[] {
  if (!raw || typeof raw !== "object") {
    return []
  }
  const rows: { label: string; value: string }[] = []

  if ("overall_risk_score" in raw) {
    const n = Number(raw.overall_risk_score)
    rows.push({
      label: "Riesgo global (IA)",
      value: Number.isFinite(n) ? `${Math.round(n)}/100` : "—",
    })
  }
  if ("neck_flexion_degrees" in raw) {
    const n = raw.neck_flexion_degrees
    rows.push({
      label: "Flexión de cuello (aprox., grados)",
      value: n == null ? "No observable" : `${Number(n).toFixed(0)}°`,
    })
  }
  if ("lumbar_support" in raw) {
    rows.push({ label: "Soporte lumbar", value: mapEnum(lumbar, raw.lumbar_support) })
  }
  if ("wrist_deviation" in raw) {
    rows.push({ label: "Postura de muñecas", value: mapEnum(wrist, raw.wrist_deviation) })
  }
  if ("monitor_height_vs_eyes" in raw) {
    rows.push({ label: "Altura del monitor", value: mapEnum(monitor, raw.monitor_height_vs_eyes) })
  }
  if ("rula_grand_score" in raw && raw.rula_grand_score != null) {
    rows.push({ label: "RULA (puntuación)", value: `${fmt(raw.rula_grand_score)}/7` })
  }
  if ("rosa_summary_score" in raw && raw.rosa_summary_score != null) {
    rows.push({ label: "ROSA (resumen)", value: `${fmt(raw.rosa_summary_score)}/10` })
  }
  if ("observation_confidence" in raw) {
    rows.push({ label: "Confianza de la observación", value: mapEnum(confidence, raw.observation_confidence) })
  }

  return rows
}
