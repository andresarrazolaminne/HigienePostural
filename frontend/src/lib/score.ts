/** Muestra puntuación de riesgo global en escala 0–100. */
export function formatScore100(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) {
    return "—"
  }
  return `${Math.round(Number(value))}/100`
}
