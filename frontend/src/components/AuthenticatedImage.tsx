import { useEffect, useRef, useState } from "react"
import { API_BASE_URL } from "../config"
import { TOKEN_KEY } from "../api/http"

type Props = {
  assessmentId: number
  alt: string
  className?: string
}

export function AuthenticatedImage({ assessmentId, alt, className }: Props) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    setFailed(false)
    const ac = new AbortController()
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setSrc(null)

    const url = `${API_BASE_URL}/assessments/${assessmentId}/image`
    const token = localStorage.getItem(TOKEN_KEY)
    const headers = new Headers()
    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }

    ;(async () => {
      try {
        const res = await fetch(url, { headers, signal: ac.signal })
        if (!res.ok) {
          throw new Error("HTTP")
        }
        const blob = await res.blob()
        if (ac.signal.aborted) {
          return
        }
        const objectUrl = URL.createObjectURL(blob)
        blobUrlRef.current = objectUrl
        setSrc(objectUrl)
      } catch {
        if (!ac.signal.aborted) {
          setFailed(true)
        }
      }
    })()

    return () => {
      ac.abort()
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [assessmentId])

  if (failed) {
    return <div className={`thumb-placeholder ${className ?? ""}`.trim()}>Sin imagen</div>
  }
  if (!src) {
    return <div className={`thumb-placeholder ${className ?? ""}`.trim()}>Cargando…</div>
  }
  return <img src={src} alt={alt} className={className} />
}
