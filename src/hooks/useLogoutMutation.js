import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth.js'
import { USER_QUERY_KEY } from './queryKeys.js'

export function useLogoutMutation(options = {}) {
  const { logout } = useAuth()
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = options

  return useMutation({
    mutationFn: async () => {
      logout()
    },
    onSuccess: (data, variables, context) => {
      queryClient.removeQueries({ queryKey: USER_QUERY_KEY })
      onSuccess?.(data, variables, context)
    },
    ...rest,
  })
}
