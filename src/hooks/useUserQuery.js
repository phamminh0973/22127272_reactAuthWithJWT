import { useQuery } from '@tanstack/react-query'
import httpClient from '../api/httpClient'
import { useAuth } from './useAuth.js'
import { USER_QUERY_KEY } from './queryKeys.js'

async function fetchUser() {
  const { data } = await httpClient.get('/auth/profile')
  return data
}

export function useUserQuery(options = {}) {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: fetchUser,
    enabled: isAuthenticated,
    staleTime: 1000 * 60,
    ...options,
  })
}
