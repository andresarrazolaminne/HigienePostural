import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { TOKEN_KEY } from "../api/http"
import * as authApi from "../api/auth"
import type { User } from "../api/types"
import { AuthContext } from "./authContext"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))

  const refreshMe = useCallback(async () => {
    const t = localStorage.getItem(TOKEN_KEY)
    if (!t) {
      setUser(null)
      setToken(null)
      setLoading(false)
      return
    }
    setToken(t)
    setLoading(true)
    try {
      const u = await authApi.fetchMe()
      setUser(u)
    } catch {
      setUser(null)
      localStorage.removeItem(TOKEN_KEY)
      setToken(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshMe()
  }, [refreshMe])

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await authApi.loginRequest(email, password)
    localStorage.setItem(TOKEN_KEY, access_token)
    setToken(access_token)
    const u = await authApi.fetchMe()
    setUser(u)
    return u
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ token, user, loading, login, logout, refreshMe }),
    [token, user, loading, login, logout, refreshMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
