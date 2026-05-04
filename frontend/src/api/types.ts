export type UserRole = "super_admin" | "operator"

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  baseline_score: number | null
  company_id: number | null
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

export interface AssessmentListItem {
  id: number
  session_id: number
  site_id: number | null
  calculated_score: number
  primary_issue: string
  created_at: string
}

export interface AssessmentDetail extends AssessmentListItem {
  raw_ai_json: Record<string, unknown>
  image_path: string
}
