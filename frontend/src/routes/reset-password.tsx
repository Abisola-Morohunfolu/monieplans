import { createFileRoute } from '@tanstack/react-router'
import { ResetPasswordPage } from '../components/auth/ResetPasswordPage'

interface ResetPasswordSearch {
  token?: string
}

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  component: ResetPasswordPage,
})
