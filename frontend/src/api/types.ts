export type UserRole = "super_admin" | "company_admin" | "expert" | "user"

export type ReviewStatus = "pending" | "approved" | "corrected"

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  baseline_score: number | null
  company_id: number | null
  access_pin?: string | null
  expert_company_ids?: number[]
}

export interface Company {
  id: number
  name: string
}

export interface Site {
  id: number
  company_id: number
  name: string
  address: string | null
}

export interface WorkSession {
  id: number
  user_id: number
  site_id: number | null
  start_time: string
  end_time: string | null
  average_score: number | null
  differential_score: number | null
  assessment_count: number
  min_score: number | null
  max_score: number | null
}

export type AssessmentProcessingStatus = "queued" | "processing" | "completed" | "failed"

export interface AssessmentListItem {
  id: number
  session_id: number
  site_id: number | null
  calculated_score: number | null
  primary_issue: string | null
  processing_status: AssessmentProcessingStatus
  processing_error?: string | null
  created_at: string
  has_professional_notes: boolean
  image_url?: string | null
  orden_aseo_score?: number | null
  orden_aseo_issue?: string | null
  review_status?: ReviewStatus
  expert_reviewed?: boolean
  score_is_provisional?: boolean
}

export interface AssessmentUploadQueuedResult {
  assessment_id: number
  session_id: number
  processing_status: AssessmentProcessingStatus
  image_url?: string | null
  queue_position?: number | null
}

export interface AssessmentDetail extends AssessmentListItem {
  orden_aseo_observations?: string[]
  raw_ai_json?: Record<string, unknown> | null
  processed_at?: string | null
  professional_notes?: string | null
  notes_updated_at?: string | null
  notes_author_name?: string | null
}

export interface AssessmentAiSnapshot {
  calculated_score: number | null
  primary_issue: string | null
  vision: Record<string, unknown> | null
}

export interface AssessmentReviewState {
  status: ReviewStatus
  expert_calculated_score: number | null
  expert_primary_issue: string | null
  expert_vision_patch: Record<string, unknown> | null
  expert_review_notes: string | null
  reviewed_at: string | null
  reviewed_by_name: string | null
}

export interface AssessmentDetailExpert extends AssessmentDetail {
  ai: AssessmentAiSnapshot | null
  review: AssessmentReviewState | null
}

export interface AssessmentReviewQueueItem {
  id: number
  session_id: number
  site_id: number | null
  site_name: string | null
  company_id: number | null
  company_name: string | null
  inspector_name: string | null
  ai_calculated_score: number | null
  ai_primary_issue: string | null
  review_status: ReviewStatus
  created_at: string
  image_url?: string | null
}

export interface AssessmentUploadResult {
  assessment_id: number
  session_id: number
  calculated_score: number
  primary_issue: string
  orden_aseo_score?: number | null
  orden_aseo_issue?: string | null
  orden_aseo_observations?: string[]
  image_url?: string | null
}

export interface ScoreStatsRead {
  count: number
  avg: number | null
  min: number | null
  max: number | null
}

export interface ScoreBucketRead {
  label: string
  min_score: number
  max_score: number
  count: number
}

export interface SiteReportSiteInfo {
  id: number
  name: string
  address: string | null
  company_id: number
  company_name: string
}

export interface SiteReportPeriod {
  first_assessment_at: string | null
  last_assessment_at: string | null
}

export interface ErgonomicsReportSection {
  stats: ScoreStatsRead
  distribution: ScoreBucketRead[]
  critical_percent: number
  factor_counts: Record<string, number>
}

export interface OrdenAseoReportSection {
  stats: ScoreStatsRead
  distribution: ScoreBucketRead[]
  severity_flag_counts: Record<string, number>
}

export interface TopIssueRead {
  text: string
  count: number
  worst_score: number
  last_at: string
  assessment_ids: number[]
}

export interface ActionItemRead {
  priority: number
  title: string
  detail: string
  assessment_id: number | null
}

export interface SessionSummaryRead {
  id: number
  start_time: string
  end_time: string | null
  photo_count: number
  avg_score: number | null
}

export interface SiteReport {
  site: SiteReportSiteInfo
  period: SiteReportPeriod
  ergonomics: ErgonomicsReportSection
  orden_aseo: OrdenAseoReportSection
  top_ergonomic_issues: TopIssueRead[]
  top_orden_issues: TopIssueRead[]
  action_items: ActionItemRead[]
  sessions_summary: SessionSummaryRead[]
  recent_assessments: AssessmentListItem[]
  pending_professional_review_count: number
  session_count: number
  assessment_count: number
}
