import { apiFetch, parseJson } from "./http"
import type {
  AssessmentDetail,
  AssessmentDetailExpert,
  AssessmentListItem,
  AssessmentReviewQueueItem,
  AssessmentUploadQueuedResult,
} from "./types"

export type { AssessmentUploadQueuedResult }

export async function listMyAssessments(): Promise<AssessmentListItem[]> {
  const res = await apiFetch("/assessments/mine")
  return parseJson<AssessmentListItem[]>(res)
}

export async function listCompanyAssessments(): Promise<AssessmentListItem[]> {
  const res = await apiFetch("/assessments/company")
  return parseJson<AssessmentListItem[]>(res)
}

export async function getAssessment(id: number): Promise<AssessmentDetail> {
  const res = await apiFetch(`/assessments/${id}`)
  return parseJson<AssessmentDetail>(res)
}

export async function getAssessmentExpert(id: number): Promise<AssessmentDetailExpert> {
  const res = await apiFetch(`/assessments/${id}`)
  return parseJson<AssessmentDetailExpert>(res)
}

export async function getReviewQueue(params?: {
  company_id?: number
  site_id?: number
  status?: string
}): Promise<AssessmentReviewQueueItem[]> {
  const q = new URLSearchParams()
  if (params?.company_id != null) q.set("company_id", String(params.company_id))
  if (params?.site_id != null) q.set("site_id", String(params.site_id))
  if (params?.status) q.set("status", params.status)
  const suffix = q.toString() ? `?${q}` : ""
  const res = await apiFetch(`/assessments/review-queue${suffix}`)
  return parseJson<AssessmentReviewQueueItem[]>(res)
}

export async function submitExpertReview(
  id: number,
  body: {
    action: "approve" | "correct"
    calculated_score?: number | null
    primary_issue?: string | null
    vision_patch?: Record<string, unknown> | null
    review_notes?: string | null
  },
): Promise<AssessmentDetailExpert> {
  const res = await apiFetch(`/assessments/${id}/expert-review`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
  return parseJson<AssessmentDetailExpert>(res)
}

export async function updateAssessmentNotes(
  id: number,
  professionalNotes: string | null,
): Promise<AssessmentDetail> {
  const res = await apiFetch(`/assessments/${id}/notes`, {
    method: "PATCH",
    body: JSON.stringify({ professional_notes: professionalNotes }),
  })
  return parseJson<AssessmentDetail>(res)
}

export async function uploadAssessment(sessionId: number, file: File): Promise<AssessmentUploadQueuedResult> {
  const fd = new FormData()
  fd.set("session_id", String(sessionId))
  fd.set("file", file)
  const res = await apiFetch("/assessments/upload", { method: "POST", body: fd })
  return parseJson<AssessmentUploadQueuedResult>(res)
}
