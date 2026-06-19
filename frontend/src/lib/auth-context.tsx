import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { loginUser, registerUser, getProfile } from "@/services/api.ts"

const TOKEN_KEY = "kingstop_token"
const USER_KEY = "kingstop_user"
const LEGACY_TOKEN_KEY = "kingswork_token"
const LEGACY_USER_KEY = "kingswork_user"

interface User {
  id: number
  email: string
  name: string
}

interface StreakData {
  current_streak: number
  longest_streak: number
  total_logins?: number
  bonus_claimed_today: boolean
  is_new_day: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  streakData: StreakData | null
  setStreakData: (data: StreakData | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [isLoading, setIsLoading] = useState(true)
  const [streakData, setStreakData] = useState<StreakData | null>(() => {
    const saved = localStorage.getItem("kingstop_streak_data")
    return saved ? JSON.parse(saved) : null
  })

  const fetchProfile = useCallback(async () => {
    if (!token) {
      setIsLoading(false)
      return
    }
    try {
      const profile = await getProfile()
      setUser(profile)
      localStorage.setItem(USER_KEY, JSON.stringify(profile))
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 401 || status === 403) {
        // Invalid token — clear it
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        localStorage.removeItem(LEGACY_TOKEN_KEY)
        localStorage.removeItem(LEGACY_USER_KEY)
        setToken(null)
        setUser(null)
      } else {
        // Network error / backend down — keep token, load cached user
        const cached = localStorage.getItem(USER_KEY)
        if (cached) setUser(JSON.parse(cached))
      }
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const login = async (email: string, password: string) => {
    const data = await loginUser(email, password)
    localStorage.setItem(TOKEN_KEY, data.access_token)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
    setToken(data.access_token)
    setUser(data.user)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    localStorage.removeItem(LEGACY_USER_KEY)
    if (data.streak) {
      localStorage.setItem("kingstop_streak_data", JSON.stringify(data.streak))
      setStreakData(data.streak)
    }
  }

  const register = async (email: string, password: string, name: string) => {
    const data = await registerUser(email, password, name)
    localStorage.setItem(TOKEN_KEY, data.access_token)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
    setToken(data.access_token)
    setUser(data.user)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    localStorage.removeItem(LEGACY_USER_KEY)
    if (data.streak) {
      localStorage.setItem("kingstop_streak_data", JSON.stringify(data.streak))
      setStreakData(data.streak)
    }
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
    localStorage.removeItem(LEGACY_USER_KEY)
    localStorage.removeItem("kingstop_streak_data")
    setToken(null)
    setUser(null)
    setStreakData(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!token && (!!user || !!localStorage.getItem(USER_KEY)),
        streakData,
        setStreakData,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
