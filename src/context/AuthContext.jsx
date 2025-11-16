import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import httpClient from '../api/httpClient'
import { clearAccessToken as clearAxiosAccessToken, setAccessToken as setAxiosAccessToken } from '../api/axiosInstance.js'
import { queryClient } from '../lib/queryClient.js'
import { USER_QUERY_KEY } from '../hooks/queryKeys.js'

const ACCESS_TOKEN_KEY = 'token'
const REFRESH_TOKEN_KEY = 'refreshToken'

const normalizeAuthPayload = (payload = {}) => {
  const token =
    payload.token ??
    payload.accessToken ??
    payload.access_token ??
    payload.jwt ??
    payload.access ??
    ''

  const refreshToken =
    payload.refreshToken ??
    payload.refresh_token ??
    payload.refresh ??
    payload.refreshJwt ??
    null

  const user = payload.user ?? payload.profile ?? null

  return { token, refreshToken, user }
}

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    if (!stored) return null
    try {
      return JSON.parse(stored)
    } catch (parseError) {
      console.warn('Corrupted user cache cleared:', parseError)
      localStorage.removeItem('user')
      return null
    }
  })
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState(null)

  const persistAuth = useCallback((nextToken, nextRefreshToken, nextUser) => {
    if (typeof nextToken !== 'undefined') {
      setToken(nextToken)
      if (nextToken) {
        setAxiosAccessToken(nextToken)
      } else {
        clearAxiosAccessToken()
      }
      localStorage.removeItem(ACCESS_TOKEN_KEY)
    }
    if (typeof nextRefreshToken !== 'undefined') {
      if (nextRefreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken)
      } else {
        localStorage.removeItem(REFRESH_TOKEN_KEY)
      }
    }
    if (typeof nextUser !== 'undefined') {
      setUser(nextUser)
      if (nextUser) {
        localStorage.setItem('user', JSON.stringify(nextUser))
      } else {
        localStorage.removeItem('user')
      }
    }
  }, [])

  const logout = useCallback((reason = null) => {
    setToken(null)
    setUser(null)
    setError(reason)
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem('user')
    clearAxiosAccessToken()
    queryClient.removeQueries({ queryKey: USER_QUERY_KEY })
  }, [])

  useEffect(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  }, [])


  useEffect(() => {
    const handleForceLogout = (event) => logout(event?.detail?.message ?? null)
    const handleTokenRefresh = (event) => {
      persistAuth(event.detail?.token, event.detail?.refreshToken)
    }
    window.addEventListener('auth:logout', handleForceLogout)
    window.addEventListener('auth:token-refreshed', handleTokenRefresh)
    return () => {
      window.removeEventListener('auth:logout', handleForceLogout)
      window.removeEventListener('auth:token-refreshed', handleTokenRefresh)
    }
  }, [logout, persistAuth])

  useEffect(() => {
    if (!initializing && token) {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY })
    }
    if (!token) {
      queryClient.removeQueries({ queryKey: USER_QUERY_KEY })
    }
  }, [token, initializing])

  const login = useCallback(async (credentials) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await httpClient.post('/auth/login', credentials)
      const normalized = normalizeAuthPayload(data)
      const nextToken = normalized.token
      const nextRefresh = normalized.refreshToken
      const nextUser = normalized.user

      persistAuth(nextToken, nextRefresh, nextUser)
      return { token: nextToken, refreshToken: nextRefresh, user: nextUser }
    } catch (err) {
      const message = err.response?.data?.message ?? err.message ?? 'Unable to sign in'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [persistAuth])

  const refreshToken = useCallback(async () => {
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!storedRefreshToken) {
      logout()
      throw new Error('Missing refresh token')
    }

    try {
      const { data } = await httpClient.post('/refresh-token', {
        refreshToken: storedRefreshToken,
      })
      const normalized = normalizeAuthPayload(data)
      const nextToken = normalized.token
      const nextRefresh = normalized.refreshToken ?? storedRefreshToken
      const nextUser = normalized.user

      persistAuth(nextToken, nextRefresh, nextUser)
      return nextToken
    } catch (err) {
      logout()
      throw err
    }
  }, [logout, persistAuth])

  useEffect(() => {
    let cancelled = false

    const bootstrapAuth = async () => {
      const hasRefreshToken = Boolean(localStorage.getItem(REFRESH_TOKEN_KEY))
      if (!hasRefreshToken) {
        if (!cancelled) {
          setInitializing(false)
        }
        return
      }

      try {
        await refreshToken()
      } catch (err) {
        console.warn('Initial token refresh failed:', err)
      } finally {
        if (!cancelled) {
          setInitializing(false)
        }
      }
    }

    bootstrapAuth()

    return () => {
      cancelled = true
    }
  }, [refreshToken])

  const value = useMemo(
    () => ({
      token,
      user,
      error,
      loading,
      initializing,
      login,
      logout,
      refreshToken,
      isAuthenticated: Boolean(token),
    }),
    [token, user, error, loading, initializing, login, logout, refreshToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
