import { useNavigate } from '@tanstack/react-router'
import {
  useSession,
  signIn,
  signUp,
  signOut,
  sendVerificationEmail,
  verifyEmail,
} from '../lib/auth'

export function useAuth() {
  const session = useSession()
  const navigate = useNavigate()

  return {
    session: session.data,
    user: session.data?.user,
    isLoading: session.isPending,
    isAuthenticated: !!session.data?.user,
    signIn,
    signUp,
    signOut: async () => {
      await signOut()
      navigate({ to: '/login' })
    },
    sendVerificationEmail,
    verifyEmail,
  }
}
