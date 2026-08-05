import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { AuthCard } from '../components/auth/AuthCard'
import { OAuthButtons } from '../components/auth/OAuthButtons'
import { PasswordInput } from '../components/auth/PasswordInput'

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
  const navigate = useNavigate()
  const { isAuthenticated, isLoading, signUp, sendVerificationEmail } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <p className="text-text-secondary">Loading...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    navigate({ to: '/dashboard' })
    return null
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
      })
      if (result.error) {
        setError(result.error.message || 'Sign up failed')
      } else {
        setEmailSent(true)
      }
    } catch {
      setError('An unexpected error occurred.')
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
        callbackURL: '/dashboard',
      })
    } catch {
      setError('Failed to resend verification email.')
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
            {resending && (
              <svg
                className="animate-spin"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            Resend verification email
          </button>
        </div>

        {error && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-[13px] font-medium leading-relaxed text-rust" role="alert">
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-[13px] leading-relaxed text-text-secondary">
          Already have an account?{' '}
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

  return (
    <AuthCard
      eyebrow="Sign up"
      title="Start your financial journey"
      subtitle="Create your free MoniePlans account."
    >
      <OAuthButtons />

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-text-primary/10" aria-hidden="true" />
        <span className="text-xs leading-none text-text-tertiary">or</span>
        <div className="flex-1 h-px bg-text-primary/10" aria-hidden="true" />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mt-4">
          <label
            htmlFor="name"
            className="block mb-1.5 text-xs font-medium tracking-[0.01em] text-text-secondary"
          >
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (error) setError('')
            }}
            className="w-full py-3 px-4 rounded-xl border border-text-primary/12 bg-bg-lightest/60 font-sans text-sm leading-relaxed text-text-primary outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-tertiary focus:border-text-primary/20 focus:shadow-[0_0_0_2px_var(--color-bg-card),0_0_0_4px_rgba(142,156,117,0.6)]"
            required
          />
        </div>

        <div className="mt-4">
          <label
            htmlFor="email"
            className="block mb-1.5 text-xs font-medium tracking-[0.01em] text-text-secondary"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (error) setError('')
            }}
            className="w-full py-3 px-4 rounded-xl border border-text-primary/12 bg-bg-lightest/60 font-sans text-sm leading-relaxed text-text-primary outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-tertiary focus:border-text-primary/20 focus:shadow-[0_0_0_2px_var(--color-bg-card),0_0_0_4px_rgba(142,156,117,0.6)]"
            required
          />
        </div>

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

        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex items-center justify-center gap-2.5 w-full py-[13px] px-4 rounded-full font-sans text-sm font-semibold leading-none cursor-pointer border-none transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] bg-text-primary text-bg-base hover:translate-y-[-2px] hover:scale-[1.03] hover:bg-forest active:scale-95 focus-visible:outline-2 focus-visible:outline-forest focus-visible:outline-offset-3 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          aria-busy={loading}
          aria-disabled={loading}
        >
          {loading && (
            <svg
              className="animate-spin shrink-0"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          )}
          <span>Create account</span>
        </button>
      </form>

      {error && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-[13px] font-medium leading-relaxed text-rust" role="alert">
          {error}
        </p>
      )}

      <p className="mt-5 text-center text-[13px] leading-relaxed text-text-secondary">
        Already have an account?{' '}
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
