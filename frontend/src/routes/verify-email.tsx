import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { AuthCard } from '../components/auth/AuthCard'
import { Button } from '../components/ui/Button'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { Spinner } from '../components/ui/Spinner'

interface VerifyEmailSearch {
  token?: string
}

export const Route = createFileRoute('/verify-email')({
  validateSearch: (search: Record<string, unknown>): VerifyEmailSearch => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const { token } = useSearch({ from: '/verify-email' })
  const navigate = useNavigate()
  const { verifyEmail, refreshSession } = useAuth()
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(true)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    if (!token) {
      setError('This verification link is invalid or expired.')
      setVerifying(false)
      return
    }

    verifyEmail({ query: { token } })
      .then((result) => {
        if (result.error) {
          setError(result.error.message || 'Verification failed.')
        } else {
          refreshSession()
          navigate({ to: '/dashboard' })
        }
      })
      .catch(() => {
        setError('An unexpected error occurred while verifying your email.')
      })
      .finally(() => {
        setVerifying(false)
      })
  }, [token, verifyEmail, refreshSession, navigate])

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
