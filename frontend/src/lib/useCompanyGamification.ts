import { useEffect, useMemo, useState } from "react"
import * as assessmentsApi from "../api/assessments"
import * as sitesApi from "../api/sites"
import type { AssessmentListItem, Site } from "../api/types"
import {
  COMPANY_TITLES,
  companyMedals,
  companyXp,
  levelFromXp,
  type CompanyMetrics,
  type Medal,
  type PlayerLevel,
} from "./gamification"

export function useCompanyGamification() {
  const [siteList, setSiteList] = useState<Site[]>([])
  const [assessments, setAssessments] = useState<AssessmentListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const [st, asm] = await Promise.all([
          sitesApi.listSites(),
          assessmentsApi.listCompanyAssessments(),
        ])
        setSiteList(st)
        setAssessments(asm)
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const avgScore = useMemo(() => {
    const completed = assessments.filter(
      (a) => a.processing_status === "completed" && a.calculated_score != null,
    )
    if (completed.length === 0) return null
    const sum = completed.reduce((a, b) => a + (b.calculated_score as number), 0)
    return sum / completed.length
  }, [assessments])

  const companyMetrics = useMemo<CompanyMetrics>(() => {
    const completedItems = assessments.filter(
      (a) => a.processing_status === "completed" && a.calculated_score != null,
    )
    const coveredSites = new Set(completedItems.map((a) => a.site_id)).size
    const reviewed = assessments.filter((a) => a.has_professional_notes).length
    return {
      totalSites: siteList.length,
      coveredSites,
      completed: completedItems.length,
      reviewed,
      avgScore,
    }
  }, [assessments, siteList, avgScore])

  const programLevel = useMemo<PlayerLevel>(
    () => levelFromXp(companyXp(companyMetrics), COMPANY_TITLES),
    [companyMetrics],
  )

  const medals = useMemo<Medal[]>(() => companyMedals(companyMetrics), [companyMetrics])

  return {
    siteList,
    assessments,
    error,
    loading,
    avgScore,
    companyMetrics,
    programLevel,
    medals,
  }
}
