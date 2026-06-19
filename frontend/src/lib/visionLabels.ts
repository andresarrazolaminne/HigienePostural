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

const severity: Record<string, string> = {
  none: "Sin hallazgo",
  mild: "Leve",
  moderate: "Moderado",
  severe: "Severo",
  not_observable: "No observable",
}

function mapSeverity(v: unknown): string {
  if (typeof v !== "string") {
    return fmt(v)
  }
  return severity[v] ?? v
}

/** Etiqueta en español para un nivel de severidad ("moderate" → "Moderado"). */
export function severityLabel(v: string): string {
  return severity[v] ?? v
}

/** Apartado Orden y Aseo desde raw_ai_json (evaluaciones nuevas). */
export function ordenAseoSummaryRows(
  raw: Record<string, unknown> | null | undefined,
): { label: string; value: string }[] {
  if (!raw || typeof raw !== "object" || raw.orden_aseo_score == null) {
    return []
  }
  const rows: { label: string; value: string }[] = []
  const score = Number(raw.orden_aseo_score)
  if (Number.isFinite(score)) {
    rows.push({ label: "Orden y aseo (IA)", value: `${Math.round(score)}/100` })
  }
  if (typeof raw.orden_aseo_issue === "string" && raw.orden_aseo_issue.trim()) {
    rows.push({ label: "Hallazgo principal (orden)", value: raw.orden_aseo_issue.trim() })
  }
  const flags: [string, string][] = [
    ["desorden_superficie", "Desorden en superficie"],
    ["residuos_limpieza", "Limpieza / residuos"],
    ["distractores_visuales", "Distractores visuales"],
    ["cables_obstaculos", "Cables y obstáculos"],
    ["iluminacion_entorno", "Iluminación y entorno"],
  ]
  for (const [key, label] of flags) {
    if (key in raw) {
      rows.push({ label, value: mapSeverity(raw[key]) })
    }
  }
  return rows
}

export function ordenAseoObservations(
  detail: { orden_aseo_observations?: string[]; raw_ai_json?: Record<string, unknown> | null },
): string[] {
  if (detail.orden_aseo_observations?.length) {
    return detail.orden_aseo_observations
  }
  const raw = detail.raw_ai_json
  if (raw && Array.isArray(raw.orden_aseo_observations)) {
    return raw.orden_aseo_observations.map((x) => String(x)).filter(Boolean)
  }
  return []
}

export function ordenAseoScore(
  detail: { orden_aseo_score?: number | null; raw_ai_json?: Record<string, unknown> | null },
): number | null {
  if (detail.orden_aseo_score != null && Number.isFinite(detail.orden_aseo_score)) {
    return detail.orden_aseo_score
  }
  const raw = detail.raw_ai_json
  if (raw && raw.orden_aseo_score != null) {
    const n = Number(raw.orden_aseo_score)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function ordenAseoIssue(
  detail: { orden_aseo_issue?: string | null; raw_ai_json?: Record<string, unknown> | null },
): string | null {
  if (detail.orden_aseo_issue?.trim()) {
    return detail.orden_aseo_issue.trim()
  }
  const raw = detail.raw_ai_json
  if (raw && typeof raw.orden_aseo_issue === "string" && raw.orden_aseo_issue.trim()) {
    return raw.orden_aseo_issue.trim()
  }
  return null
}
