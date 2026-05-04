import { createContext } from "react"
import type { User } from "../api/types"

export type AuthValue = {
  token: string | null
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
  refreshMe: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)
