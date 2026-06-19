/** Convierte puntuación de riesgo (0–100, menor = mejor) en nivel de informe del inspector. */
export type GameTier = "s" | "a" | "b" | "c" | "d" | "none"

export type GameRank = {
  tier: GameTier
  title: string
  subtitle: string
  tone: "good" | "mid" | "high" | "neutral"
  /** 0–100 para barra circular (más = mejor postura). */
  vitality: number
}

export function scoreToRank(score: number | null | undefined): GameRank {
  if (score == null || Number.isNaN(Number(score))) {
    return {
      tier: "none",
      title: "—",
      subtitle: "Sin datos",
      tone: "neutral",
      vitality: 0,
    }
  }
  const s = Math.round(Number(score))
  const vitality = Math.max(0, Math.min(100, 100 - s))

  if (s <= 25) {
    return { tier: "s", title: "Óptimo", subtitle: "Postura excelente", tone: "good", vitality }
  }
  if (s <= 40) {
    return { tier: "a", title: "Conforme", subtitle: "Dentro de parámetros", tone: "good", vitality }
  }
  if (s <= 55) {
    return { tier: "b", title: "Observación", subtitle: "Revisar detalles", tone: "mid", vitality }
  }
  if (s <= 70) {
    return { tier: "c", title: "Alerta", subtitle: "Ajustes recomendados", tone: "mid", vitality }
  }
  return { tier: "d", title: "Crítico", subtitle: "Acción prioritaria", tone: "high", vitality }
}

export function tierLabel(tier: GameTier): string {
  if (tier === "none") return "?"
  return tier.toUpperCase()
}

/**
 * Orden y aseo: mayor = mejor (inverso al riesgo ergonómico).
 * Reutiliza la escala de `scoreToRank` invirtiendo el valor para que
 * un score alto obtenga tier/tono "bueno" y uno bajo "crítico".
 */
export function ordenScoreToRank(score: number | null | undefined): GameRank {
  if (score == null || Number.isNaN(Number(score))) {
    return scoreToRank(null)
  }
  return scoreToRank(100 - Number(score))
}
