import { useMutation } from '@tanstack/react-query'
import { resetPassword } from '../lib/auth'

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ newPassword, token }: { newPassword: string; token: string }) =>
      resetPassword({ newPassword, token }),
  })
}
