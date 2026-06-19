/**
 * Capa de gamificación transversal: niveles, XP y logros.
 *
 * El objetivo es dar una lectura de "progreso de juego" a cualquier rol
 * (inspector, empresa, experto) a partir de métricas reales de la operación.
 * La librería trabaja con primitivos para no acoplarse a los tipos de API.
 */

export type PlayerLevel = {
  /** Nivel actual (1..n). */
  level: number
  /** Título temático del nivel. */
  title: string
  /** XP acumulada total. */
  totalXp: number
  /** XP dentro del nivel actual. */
  levelXp: number
  /** XP necesaria para completar el nivel actual. */
  levelSpan: number
  /** Progreso 0..1 hacia el siguiente nivel. */
  progress: number
  /** XP que falta para subir de nivel. */
  xpToNext: number
  /** true si ya está en el nivel máximo. */
  maxed: boolean
}

/** Títulos temáticos para el rol inspector. */
export const INSPECTOR_TITLES = [
  "Aprendiz",
  "Explorador",
  "Inspector",
  "Inspector Sr.",
  "Especialista",
  "Veterano",
  "Maestro",
  "Leyenda",
]

/** Títulos de madurez para el programa de la empresa. */
export const COMPANY_TITLES = [
  "Inicial",
  "En marcha",
  "En desarrollo",
  "Establecido",
  "Gestionado",
  "Consolidado",
  "Optimizado",
  "Referente",
]

/** XP requerida para superar un nivel concreto (curva creciente suave). */
function spanForLevel(level: number): number {
  return 120 + (level - 1) * 80
}

export function levelFromXp(totalXp: number, titles: string[] = INSPECTOR_TITLES): PlayerLevel {
  const maxLevel = titles.length
  const xp = Math.max(0, Math.round(totalXp))
  let level = 1
  let remaining = xp
  let span = spanForLevel(level)

  while (level < maxLevel && remaining >= span) {
    remaining -= span
    level += 1
    span = spanForLevel(level)
  }

  const maxed = level >= maxLevel
  const levelXp = maxed ? span : remaining
  const progress = maxed ? 1 : Math.max(0, Math.min(1, remaining / span))

  return {
    level,
    title: titles[level - 1] ?? `Nivel ${level}`,
    totalXp: xp,
    levelXp,
    levelSpan: span,
    progress,
    xpToNext: maxed ? 0 : Math.max(0, span - remaining),
    maxed,
  }
}

export type Achievement = {
  id: string
  icon: string
  title: string
  description: string
  earned: boolean
  /** Progreso opcional para logros con meta numérica. */
  progress?: { current: number; target: number }
}

export type InspectorMetrics = {
  /** Evidencias procesadas (completadas). */
  completed: number
  /** Evidencias con buen resultado (riesgo bajo). */
  good: number
  /** Sedes distintas inspeccionadas. */
  sites: number
  /** Sesiones de trabajo creadas. */
  sessions: number
}

/**
 * XP del inspector a partir de su actividad real.
 * Cada evidencia suma base; las de bajo riesgo y la cobertura de sedes
 * otorgan bonus para premiar calidad y constancia.
 */
export function inspectorXp(m: InspectorMetrics): number {
  return m.completed * 14 + m.good * 8 + m.sites * 20 + m.sessions * 6
}

export function inspectorAchievements(m: InspectorMetrics): Achievement[] {
  return [
    {
      id: "first-evidence",
      icon: "📸",
      title: "Primer hallazgo",
      description: "Captura tu primera evidencia",
      earned: m.completed >= 1,
      progress: { current: Math.min(m.completed, 1), target: 1 },
    },
    {
      id: "ten-evidences",
      icon: "🗂️",
      title: "Cazador de datos",
      description: "Procesa 10 evidencias",
      earned: m.completed >= 10,
      progress: { current: Math.min(m.completed, 10), target: 10 },
    },
    {
      id: "multi-site",
      icon: "🗺️",
      title: "Explorador de campo",
      description: "Inspecciona 3 sedes distintas",
      earned: m.sites >= 3,
      progress: { current: Math.min(m.sites, 3), target: 3 },
    },
    {
      id: "quality",
      icon: "🌟",
      title: "Ojo experto",
      description: "Consigue 5 evidencias de bajo riesgo",
      earned: m.good >= 5,
      progress: { current: Math.min(m.good, 5), target: 5 },
    },
  ]
}

export type CompanyMetrics = {
  /** Total de sedes de la empresa. */
  totalSites: number
  /** Sedes con al menos una evidencia. */
  coveredSites: number
  /** Total de evidencias completadas. */
  completed: number
  /** Informes revisados por experto. */
  reviewed: number
  /** Promedio ergonómico (0..100, menor = mejor). null si no hay datos. */
  avgScore: number | null
}

/**
 * XP de "madurez del programa" de la empresa: premia cobertura de sedes,
 * volumen de evidencias y validación experta.
 */
export function companyXp(m: CompanyMetrics): number {
  const coverageBonus = m.totalSites > 0 ? Math.round((m.coveredSites / m.totalSites) * 200) : 0
  return m.completed * 10 + m.reviewed * 18 + coverageBonus
}

export function companyAchievements(m: CompanyMetrics): Achievement[] {
  const fullCoverage = m.totalSites > 0 && m.coveredSites >= m.totalSites
  return [
    {
      id: "program-start",
      icon: "🚀",
      title: "Programa en marcha",
      description: "Registra tu primera evidencia",
      earned: m.completed >= 1,
      progress: { current: Math.min(m.completed, 1), target: 1 },
    },
    {
      id: "coverage",
      icon: "🏢",
      title: "Cobertura total",
      description: "Evalúa todas las sedes",
      earned: fullCoverage,
      progress: { current: m.coveredSites, target: Math.max(m.totalSites, 1) },
    },
    {
      id: "expert-validated",
      icon: "🩺",
      title: "Validado por experto",
      description: "Recibe 3 informes revisados",
      earned: m.reviewed >= 3,
      progress: { current: Math.min(m.reviewed, 3), target: 3 },
    },
    {
      id: "healthy-avg",
      icon: "💪",
      title: "Entorno saludable",
      description: "Mantén un riesgo promedio bajo",
      earned: m.avgScore != null && m.avgScore <= 40,
    },
  ]
}
