import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../hooks/useAuth'
import { AuthCard } from './AuthCard'
import { Button } from '../ui/Button'
import { ErrorMessage } from '../ui/ErrorMessage'
import { Spinner } from '../ui/Spinner'
import { useVerifyEmail } from '../../hooks/useVerifyEmail'

export function VerifyEmailPage() {
  const { token } = useSearch({ from: '/verify-email' })
  const navigate = useNavigate()
  const { refreshSession } = useAuth()
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(true)
  const started = useRef(false)
  const mutation = useVerifyEmail()

  useEffect(() => {
    if (started.current) return
    started.current = true

    if (!token) {
      setError('This verification link is invalid or expired.')
      setVerifying(false)
      return
    }

    mutation.mutate(token, {
      onSuccess: (result) => {
        if (result.error) {
          setError(result.error.message || 'Verification failed.')
          toast.error(result.error.message || 'Verification failed.')
        } else {
          toast.success('Email verified!')
          refreshSession()
          navigate({ to: '/dashboard' })
        }
      },
      onError: () => {
        setError('An unexpected error occurred while verifying your email.')
      },
      onSettled: () => {
        setVerifying(false)
      },
    })
  }, [token, mutation, refreshSession, navigate])

  return (
    <AuthCard
      eyebrow="Verify email"
      title="Confirming your email address"
      subtitle="Just a moment while we verify your account."
    >
      {verifying ? (
        <div className="mt-10 flex justify-center">
          <Spinner size={28} />
        </div>
      ) : (
        <div className="mt-8 text-center">
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {!error && (
            <p className="text-[13px] text-text-secondary">
              Your email has been verified. Redirecting…
            </p>
          )}
        </div>
      )}

      {!verifying && error && (
        <div className="mt-6 flex flex-col gap-3">
          <Button variant="solid" size="sm" fullWidth onClick={() => navigate({ to: '/login' })}>
            Go to sign in
          </Button>
          <Button variant="outline" size="sm" fullWidth onClick={() => navigate({ to: '/signup' })}>
            Create an account
          </Button>
        </div>
      )}
    </AuthCard>
  )
}
