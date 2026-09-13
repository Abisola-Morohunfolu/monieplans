import { useMutation } from '@tanstack/react-query'
import { verifyEmail } from '../lib/auth'

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) => verifyEmail({ query: { token } }),
  })
}
