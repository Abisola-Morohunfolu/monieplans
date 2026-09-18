import { createFileRoute, Link, Navigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../hooks/useAuth'
import { AuthCard } from '../components/auth/AuthCard'
import { OAuthButtons } from '../components/auth/OAuthButtons'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PasswordInput } from '../components/ui/PasswordInput'
import { Divider } from '../components/ui/Divider'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { Spinner } from '../components/ui/Spinner'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [resending, setResending] = useState(false)
  const { isAuthenticated, isLoading, signUp, sendVerificationEmail, refreshSession } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <Spinner />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.')
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
      const result = await signUp.email({
        name,
        email,
        password,
        callbackURL: `${window.location.origin}/dashboard`,
      })
      if (result.error) {
        toast.error(result.error.message || 'Sign up failed')
      } else {
        await refreshSession()
        toast.success('Account created — check your email to verify.')
        setEmailSent(true)
      }
    } catch {
      toast.error('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resending) return
    setResending(true)
    setError('')
    try {
      await sendVerificationEmail({
        email,
        callbackURL: `${window.location.origin}/dashboard`,
      })
      toast.success('Verification email resent.')
    } catch {
      toast.error('Failed to resend verification email.')
    } finally {
      setResending(false)
    }
  }

  if (emailSent) {
    return (
      <AuthCard
        eyebrow="Check your email"
        title="Verify your email address"
        subtitle={`We sent a verification link to ${email}. Click the link to activate your account.`}
      >
        <div className="mt-8 text-center">
          <p className="text-[13px] text-text-tertiary mb-4">
            Didn't receive the email? Check your spam folder.
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="inline-flex items-center gap-2 text-[13px] font-medium text-forest hover:underline cursor-pointer bg-transparent border-none p-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resending && <Spinner size={14} />}
            Resend verification email
          </button>
        </div>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <p className="mt-6 text-center text-[13px] leading-relaxed text-text-secondary">
          Already have an account?{' '}
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

  return (
    <AuthCard
      eyebrow="Sign up"
      title="Start your financial journey"
      subtitle="Create your free MoniePlans account."
    >
      <OAuthButtons />

      <Divider />

      <form onSubmit={handleSubmit}>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          label="Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (error) setError('')
          }}
          required
        />

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

        <PasswordInput
          label="Password"
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
          label="Confirm password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value)
            if (error) setError('')
          }}
        />

        <Button type="submit" variant="solid" size="sm" fullWidth loading={loading} className="mt-6">
          Create account
        </Button>
      </form>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <p className="mt-5 text-center text-[13px] leading-relaxed text-text-secondary">
        Already have an account?{' '}
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
