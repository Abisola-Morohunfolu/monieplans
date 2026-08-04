import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

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
  const navigate = useNavigate()
  const { redirect } = useSearch({ from: '/login' })
  const { isAuthenticated, isLoading, signIn } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <div className="card p-8">
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    navigate({ to: redirect || '/dashboard' })
    return null
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const { error: signInError } = await signIn.email({ email, password })
      if (signInError) {
        setError(signInError.message || 'Login failed')
      } else {
        navigate({ to: redirect || '/dashboard' })
      }
    } catch {
      setError('An unexpected error occurred.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sage/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-forest/8 rounded-full blur-[80px] pointer-events-none" />

      <div className="card w-full max-w-md relative z-10 p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-sage text-white text-xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sage/25">
            M
          </div>
          <h2 className="font-heading text-3xl font-medium text-text-primary">Welcome back</h2>
          <p className="text-text-secondary mt-1">Sign in to your Monieplans account</p>
        </div>

        {error && (
          <div className="p-3 mb-6 bg-rust/10 border border-rust/20 text-rust rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            Sign In
          </button>
        </form>

        <p className="text-center text-sm text-text-tertiary mt-6">
          Don't have an account? <a href="#" className="text-sage hover:text-forest transition-colors">Sign up</a>
        </p>
      </div>
    </div>
  )
}
