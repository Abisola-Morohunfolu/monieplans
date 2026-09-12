import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { requestPasswordReset } from '../lib/auth'
import { AuthCard } from '../components/auth/AuthCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ErrorMessage } from '../components/ui/ErrorMessage'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const result = await requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/login`,
      })
      if (result.error) {
        setError(result.error.message || 'Something went wrong.')
      } else {
        setSent(true)
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthCard
        eyebrow="Check your email"
        title="Reset link sent"
        subtitle={`If an account exists for ${email}, we sent a password reset link. Click the link to set a new password.`}
      >
        <p className="mt-8 text-center text-[13px] text-text-tertiary">
          Didn't receive the email? Check your spam folder.
        </p>

        <Button
          variant="outline"
          size="sm"
          fullWidth
          className="mt-6"
          onClick={() => navigate({ to: '/login' })}
        >
          Back to sign in
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      eyebrow="Forgot password"
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
    >
      <form onSubmit={handleSubmit}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          label="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError('')
          }}
          required
        />

        <Button type="submit" variant="solid" size="sm" fullWidth loading={loading} className="mt-6">
          Send reset link
        </Button>
      </form>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <p className="mt-5 text-center text-[13px] leading-relaxed text-text-secondary">
        Remembered your password?{' '}
        <a
          href="/login"
          onClick={(e) => {
            e.preventDefault()
            navigate({ to: '/login' })
          }}
          className="text-forest font-medium no-underline underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-forest focus-visible:outline-offset-3 focus-visible:rounded"
        >
          Sign in
        </a>
      </p>
    </AuthCard>
  )
}
