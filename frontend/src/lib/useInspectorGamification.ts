import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as assessmentsApi from "../api/assessments"
import { formatFetchError } from "../api/http"
import * as sitesApi from "../api/sites"
import { useAuth } from "../auth/useAuth"
import type { AssessmentListItem, Site } from "../api/types"
import {
  inspectorMedals,
  inspectorXp,
  levelFromXp,
  type InspectorMetrics,
  type Medal,
  type PlayerLevel,
} from "./gamification"

function errMsg(e: unknown): string | null {
  const msg = formatFetchError(e)
  return msg || null
}

export function useInspectorGamification() {
  const { loading: authLoading, user } = useAuth()
  const [sites, setSites] = useState<Site[]>([])
  const [assessments, setAssessments] = useState<AssessmentListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const loadGen = useRef(0)

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setError(null)
    let sitesErr: string | null = null
    let asmErr: string | null = null

    try {
      if (signal?.aborted) return
      setSites(await sitesApi.listSitesMine())
    } catch (e) {
      if (signal?.aborted) return
      sitesErr = errMsg(e)
      setSites([])
    }

    try {
      if (signal?.aborted) return
      setAssessments(await assessmentsApi.listMyAssessments())
    } catch (e) {
      if (signal?.aborted) return
      asmErr = errMsg(e)
      setAssessments([])
    }

    if (signal?.aborted) return
    if (sitesErr && asmErr) setError(sitesErr)
    else if (sitesErr) setError(`Sedes: ${sitesErr}`)
    else if (asmErr) setError(`Historial: ${asmErr}`)
  }, [])

  useEffect(() => {
    if (authLoading || !user) return

    const gen = ++loadGen.current
    const ctrl = new AbortController()
    setLoading(true)

    const timer = window.setTimeout(() => {
      void loadData(ctrl.signal).finally(() => {
        if (loadGen.current === gen) setLoading(false)
      })
    }, 50)

    return () => {
      window.clearTimeout(timer)
      ctrl.abort()
    }
  }, [authLoading, user, loadData])

  const metrics = useMemo<InspectorMetrics>(() => {
    const completedItems = assessments.filter(
      (a) => a.processing_status === "completed" && a.calculated_score != null,
    )
    const good = completedItems.filter((a) => (a.calculated_score as number) <= 40).length
    const siteIds = new Set(completedItems.map((a) => a.site_id))
    const sessionIds = new Set(assessments.map((a) => a.session_id))
    return {
      completed: completedItems.length,
      good,
      sites: siteIds.size,
      sessions: sessionIds.size,
    }
  }, [assessments])

  const playerLevel = useMemo<PlayerLevel>(
    () => levelFromXp(inspectorXp(metrics)),
    [metrics],
  )

  const medals = useMemo<Medal[]>(() => inspectorMedals(metrics), [metrics])

  return {
    sites,
    assessments,
    error,
    loading: authLoading || loading,
    loadData,
    metrics,
    playerLevel,
    medals,
  }
}
