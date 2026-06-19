import type { AssessmentListItem, WorkSession } from "../api/types"

export type ScoreStats = {
  count: number
  avg: number | null
  min: number | null
  max: number | null
}

export function statsFromScores(scores: number[]): ScoreStats {
  if (scores.length === 0) {
    return { count: 0, avg: null, min: null, max: null }
  }
  const sum = scores.reduce((a, b) => a + b, 0)
  return {
    count: scores.length,
    avg: sum / scores.length,
    min: Math.min(...scores),
    max: Math.max(...scores),
  }
}

function completedScores(assessments: AssessmentListItem[]): number[] {
  return assessments
    .filter((a) => a.processing_status === "completed" && a.calculated_score != null)
    .map((a) => a.calculated_score as number)
}

export function siteStats(assessments: AssessmentListItem[], siteId: number): ScoreStats {
  return statsFromScores(
    completedScores(assessments.filter((a) => a.site_id === siteId)),
  )
}

export function sessionStatsFromSession(ws: WorkSession): ScoreStats {
  if ((ws.assessment_count ?? 0) === 0) {
    return { count: 0, avg: ws.average_score, min: ws.min_score, max: ws.max_score }
  }
  return {
    count: ws.assessment_count,
    avg: ws.average_score,
    min: ws.min_score,
    max: ws.max_score,
  }
}

export function sessionStatsFromAssessments(items: AssessmentListItem[]): ScoreStats {
  return statsFromScores(completedScores(items))
}

export function assessmentsForSession(assessments: AssessmentListItem[], sessionId: number): AssessmentListItem[] {
  return assessments
    .filter((a) => a.session_id === sessionId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return iso
  }
}

export function formatDateOnly(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es", { dateStyle: "medium" })
  } catch {
    return iso
  }
}
