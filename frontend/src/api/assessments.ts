import { apiFetch, parseJson } from "./http"
import type { AssessmentDetail, AssessmentListItem } from "./types"

export async function listMyAssessments(): Promise<AssessmentListItem[]> {
  const res = await apiFetch("/assessments/mine")
  return parseJson<AssessmentListItem[]>(res)
}

export async function getAssessment(id: number): Promise<AssessmentDetail> {
  const res = await apiFetch(`/assessments/${id}`)
  return parseJson<AssessmentDetail>(res)
}

export async function uploadAssessment(sessionId: number, file: File): Promise<unknown> {
  const fd = new FormData()
  fd.set("session_id", String(sessionId))
  fd.set("file", file)
  const res = await apiFetch("/assessments/upload", { method: "POST", body: fd })
  return parseJson(res)
}
