import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { signIn } from '../lib/auth'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      // Assuming email/password login is setup on backend
      const { data, error } = await signIn.email({ email, password })
      if (error) {
        setError(error.message || 'Login failed')
      } else {
        navigate({ to: '/dashboard' })
      }
    } catch (err: any) {
      setError('An unexpected error occurred.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="glass-card w-full max-w-md relative z-10 p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary text-white text-xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            M
          </div>
          <h2 className="text-2xl font-bold">Welcome back</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Sign in to your Monieplans account</p>
        </div>

        {error && (
          <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-2.5 bg-primary hover:bg-[#922ce0] text-white font-medium rounded-lg shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
          >
            Sign In
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account? <a href="#" className="text-primary hover:underline">Sign up</a>
        </p>
      </div>
    </div>
  )
}
