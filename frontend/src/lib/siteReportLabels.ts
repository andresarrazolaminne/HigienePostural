export const ERGONOMIC_FACTOR_LABELS: Record<string, string> = {
  lumbar_inadequate: "Soporte lumbar insuficiente",
  wrist_non_neutral: "Muñecas en postura no neutra",
  monitor_off_level: "Monitor fuera de altura ocular",
  neck_flexion_noted: "Flexión cervical elevada",
}

export const ORDEN_FLAG_LABELS: Record<string, string> = {
  desorden_superficie: "Desorden en superficies",
  residuos_limpieza: "Residuos / limpieza",
  distractores_visuales: "Distractores visuales",
  cables_obstaculos: "Cables u obstáculos",
  iluminacion_entorno: "Iluminación del entorno",
}

export function labelForFactor(key: string): string {
  return ERGONOMIC_FACTOR_LABELS[key] ?? key.replace(/_/g, " ")
}

export function labelForOrdenFlag(key: string): string {
  return ORDEN_FLAG_LABELS[key] ?? key.replace(/_/g, " ")
}
