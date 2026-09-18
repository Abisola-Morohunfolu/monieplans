import { Link, useSearch } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { AuthCard } from './AuthCard'
import { Button } from '../ui/Button'
import { PasswordInput } from '../ui/PasswordInput'
import { ErrorMessage } from '../ui/ErrorMessage'
import { useResetPassword } from '../../hooks/useResetPassword'

export function ResetPasswordPage() {
  const { token } = useSearch({ from: '/reset-password' })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const mutation = useResetPassword()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (mutation.isPending) return

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
    mutation.mutate(
      { newPassword: password, token },
      {
        onSuccess: (result) => {
          if (result.error) {
            setError(result.error.message || 'Reset failed.')
            toast.error(result.error.message || 'Reset failed.')
          } else {
            toast.success('Password updated.')
            setDone(true)
          }
        },
        onError: () => {
          setError('An unexpected error occurred.')
        },
      },
    )
  }

  if (done) {
    return (
      <AuthCard
        eyebrow="Password reset"
        title="Your password is updated"
        subtitle="You can now sign in with your new password."
      >
        <Link
          to="/login"
          className="mt-8 inline-flex w-full items-center justify-center gap-2.5 rounded-full font-sans leading-none cursor-pointer transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] focus-visible:outline-2 focus-visible:outline-forest focus-visible:outline-offset-3 bg-text-primary text-bg-base hover:bg-forest px-4 py-[13px] text-sm font-semibold hover:-translate-y-0.5 hover:scale-[1.03] active:scale-95"
        >
          Sign in
        </Link>
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

        <Button
          type="submit"
          variant="solid"
          size="sm"
          fullWidth
          loading={mutation.isPending}
          className="mt-6"
        >
          Reset password
        </Button>
      </form>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <p className="mt-5 text-center text-[13px] leading-relaxed text-text-secondary">
        Remembered your password?{' '}
        <Link
          to="/login"
          className="text-forest font-medium no-underline underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-forest focus-visible:outline-offset-3 focus-visible:rounded"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}
