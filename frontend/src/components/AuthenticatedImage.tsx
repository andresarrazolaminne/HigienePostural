import { useEffect, useRef, useState } from "react"
import { resolveApiUrl, TOKEN_KEY } from "../api/http"

type Props = {
  assessmentId: number
  imageUrl?: string | null
  alt: string
  className?: string
  lazy?: boolean
}

export function AuthenticatedImage({ assessmentId, imageUrl, alt, className, lazy }: Props) {
  const [src, setSrc] = useState<string | null>(imageUrl ?? null)
  const [failed, setFailed] = useState(false)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (imageUrl) {
      setSrc(imageUrl)
      setFailed(false)
      return
    }

    setFailed(false)
    const ac = new AbortController()
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setSrc(null)

    const url = resolveApiUrl(`/assessments/${assessmentId}/image`)
    const token = localStorage.getItem(TOKEN_KEY)
    const headers = new Headers()
    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }

    ;(async () => {
      try {
        const res = await fetch(url, { headers, signal: ac.signal, redirect: "follow" })
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
  }, [assessmentId, imageUrl])

  if (failed) {
    return (
      <div className={`thumb-placeholder thumb-placeholder--empty ${className ?? ""}`.trim()}>
        <span className="thumb-placeholder-icon" aria-hidden>
          ⛰
        </span>
        <span>Sin imagen</span>
      </div>
    )
  }
  if (!src) {
    return (
      <div
        className={`thumb-placeholder thumb-placeholder--loading ${className ?? ""}`.trim()}
        aria-busy="true"
        aria-label="Cargando imagen"
      />
    )
  }
  return <img src={src} alt={alt} className={className} loading={lazy ? "lazy" : undefined} decoding="async" />
}