import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'
const REFRESH_ENDPOINT = '/refresh-token'
const LOGIN_ENDPOINT = '/auth/login'
const ACCESS_TOKEN_KEY = 'token'
const REFRESH_TOKEN_KEY = 'refreshToken'
const LOGIN_ROUTE = '/login'

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let inMemoryAccessToken = null

const setAccessToken = (token) => {
  inMemoryAccessToken = typeof token === 'string' && token.length > 0 ? token : null
}

const clearAccessToken = () => {
  inMemoryAccessToken = null
}

const getAccessToken = () => inMemoryAccessToken
const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY)

const storeRefreshToken = (refreshToken) => {
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }
}

const emitTokenRefresh = (accessToken, refreshToken) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('auth:token-refreshed', {
      detail: { token: accessToken, refreshToken },
    }),
  )
}

const logoutUser = (message = 'Phiên đăng nhập đã kết thúc, vui lòng đăng nhập lại.') => {
  clearAccessToken()
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem('user')
  window.dispatchEvent(
    new CustomEvent('auth:logout', {
      detail: { message },
    }),
  )
  if (window.location.pathname !== LOGIN_ROUTE) {
    window.location.href = LOGIN_ROUTE
  }
}

axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise = null

const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('Missing refresh token')
  }

  const { data } = await axios.post(
    `${API_BASE_URL}${REFRESH_ENDPOINT}`,
    { refreshToken },
    { withCredentials: true },
  )

  const newAccessToken = data?.token
  const newRefreshToken = data?.refreshToken ?? refreshToken

  if (!newAccessToken) {
    throw new Error('Refresh response missing access token')
  }

  setAccessToken(newAccessToken)
  storeRefreshToken(newRefreshToken)
  emitTokenRefresh(newAccessToken, newRefreshToken)
  return newAccessToken
}

const getRefreshPromise = () => {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken()
      .catch((error) => {
        logoutUser('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục làm việc.')
        throw error
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const originalRequest = error.config ?? {}

    if (status !== 401 || !originalRequest) {
      return Promise.reject(error)
    }

    const requestUrl = originalRequest.url ?? ''
    const isRefreshCall = requestUrl.includes(REFRESH_ENDPOINT)
    const isLoginCall = requestUrl.includes(LOGIN_ENDPOINT)

    if (isLoginCall) {
      return Promise.reject(error)
    }

    if (isRefreshCall) {
      logoutUser('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục làm việc.')
      return Promise.reject(error)
    }

    const hasRefreshToken = Boolean(getRefreshToken())
    const hadAuthHeader = Boolean(originalRequest.headers?.Authorization)

    const shouldAttemptRefresh =
      hasRefreshToken &&
      hadAuthHeader &&
      !originalRequest._retry

    if (shouldAttemptRefresh) {
      originalRequest._retry = true
      try {
        const newToken = await getRefreshPromise()
        if (!newToken) {
          throw new Error('Unable to refresh access token')
        }
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        return Promise.reject(refreshError)
      }
    }

    logoutUser('Bạn không còn quyền truy cập. Đăng nhập lại để tiếp tục.')
    return Promise.reject(error)
  },
)

export { logoutUser }
export { setAccessToken, clearAccessToken }
export default axiosInstance
