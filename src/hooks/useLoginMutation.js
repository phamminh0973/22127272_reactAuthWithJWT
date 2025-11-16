import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth.js'
import { USER_QUERY_KEY } from './queryKeys.js'

export function useLoginMutation(options = {}) {
  const { login } = useAuth()
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = options

  return useMutation({
    mutationFn: login,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY })
      onSuccess?.(data, variables, context)
    },
    ...rest,
  })
}
