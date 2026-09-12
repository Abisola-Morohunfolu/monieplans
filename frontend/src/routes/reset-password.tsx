import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { resetPassword } from '../lib/auth'
import { AuthCard } from '../components/auth/AuthCard'
import { Button } from '../components/ui/Button'
import { PasswordInput } from '../components/ui/PasswordInput'
import { ErrorMessage } from '../components/ui/ErrorMessage'

interface ResetPasswordSearch {
  token?: string
}

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = useSearch({ from: '/reset-password' })
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return

    if (!token) {
      setError('This reset link is invalid or expired.')
      return
    }

    if (!password) {
      setError('Please enter a new password.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const result = await resetPassword({ newPassword: password, token })
      if (result.error) {
        setError(result.error.message || 'Reset failed.')
      } else {
        setDone(true)
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthCard
        eyebrow="Password reset"
        title="Your password is updated"
        subtitle="You can now sign in with your new password."
      >
        <Button
          variant="solid"
          size="sm"
          fullWidth
          className="mt-8"
          onClick={() => navigate({ to: '/login' })}
        >
          Sign in
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      eyebrow="Reset password"
      title="Choose a new password"
      subtitle="Enter a new password for your account."
    >
      <form onSubmit={handleSubmit}>
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (error) setError('')
          }}
        />

        <PasswordInput
          id="confirm-password"
          label="Confirm new password"
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value)
            if (error) setError('')
          }}
        />

        <Button type="submit" variant="solid" size="sm" fullWidth loading={loading} className="mt-6">
          Reset password
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
