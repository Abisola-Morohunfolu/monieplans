import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { AuthCard } from '../components/auth/AuthCard'
import { OAuthButtons } from '../components/auth/OAuthButtons'
import { PasswordInput } from '../components/auth/PasswordInput'

interface LoginSearch {
  redirect?: string
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    return {
      redirect: search.redirect as string | undefined,
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { redirect } = useSearch({ from: '/login' })
  const { isAuthenticated, isLoading, signIn } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <p className="text-text-secondary">Loading...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    navigate({ to: redirect || '/dashboard' })
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const result = await signIn.email({ email, password })
      if (result.error) {
        setError(result.error.message || 'Login failed')
      } else {
        navigate({ to: redirect || '/dashboard' })
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      eyebrow="Sign in"
      title={
        <>
          Welcome back to your <em className="not-italic text-forest">budget</em>
        </>
      }
      subtitle="Pick up where you left off."
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
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            if (error) setError('')
          }}
          placeholder="Your password"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit(e)
          }}
        />

        <div className="mt-2 flex justify-end">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="text-xs leading-relaxed text-sage no-underline hover:underline focus-visible:outline-2 focus-visible:outline-sage focus-visible:outline-offset-3 focus-visible:rounded"
          >
            Forgot password?
          </a>
        </div>

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
          <span>Sign in</span>
        </button>
      </form>

      {error && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-[13px] font-medium leading-relaxed text-rust" role="alert">
          {error}
        </p>
      )}

      <p className="mt-5 text-center text-[13px] leading-relaxed text-text-secondary">
        Don't have an account?{' '}
        <a
          href="/signup"
          onClick={(e) => {
            e.preventDefault()
            navigate({ to: '/signup' })
          }}
          className="text-forest font-medium no-underline underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-forest focus-visible:outline-offset-3 focus-visible:rounded"
        >
          Create one
        </a>
      </p>
    </AuthCard>
  )
}
