import { createFileRoute, Link, useNavigate, useSearch, Navigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { AuthCard } from '../components/auth/AuthCard'
import { OAuthButtons } from '../components/auth/OAuthButtons'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PasswordInput } from '../components/ui/PasswordInput'
import { Divider } from '../components/ui/Divider'
import { ErrorMessage } from '../components/ui/ErrorMessage'
import { Spinner } from '../components/ui/Spinner'

interface LoginSearch {
  redirect?: string
  error?: string
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    return {
      redirect: search.redirect as string | undefined,
      error: search.error as string | undefined,
    }
  },
  component: LoginPage,
})

function oauthErrorMessage(code?: string): string {
  switch (code) {
    case 'email_not_found':
      return "We couldn't find an email on your GitHub account. Add a public email to GitHub or use email/password."
    default:
      return code
        ? `Sign in failed (${code.replaceAll('_', ' ')}).`
        : ''
  }
}

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { redirect, error: oauthError } = useSearch({ from: '/login' })
  const { isAuthenticated, isLoading, signIn, refreshSession } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <Spinner />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={redirect || '/dashboard'} replace />
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
        await refreshSession()
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
      {oauthError && <ErrorMessage>{oauthErrorMessage(oauthError)}</ErrorMessage>}

      <OAuthButtons />

      <Divider />

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
          <Link
            to="/forgot-password"
            className="text-xs leading-relaxed text-sage no-underline hover:underline focus-visible:outline-2 focus-visible:outline-sage focus-visible:outline-offset-3 focus-visible:rounded"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="solid" size="sm" fullWidth loading={loading} className="mt-6">
          Sign in
        </Button>
      </form>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <p className="mt-5 text-center text-[13px] leading-relaxed text-text-secondary">
        Don't have an account?{' '}
        <Link
          to="/signup"
          className="text-forest font-medium no-underline underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-forest focus-visible:outline-offset-3 focus-visible:rounded"
        >
          Create one
        </Link>
      </p>
    </AuthCard>
  )
}
