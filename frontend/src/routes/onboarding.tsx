import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { fetchSession } from '../hooks/useSession'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { queryClient } from '../lib/queryClient'
import { queryKeys } from '../lib/queryKeys'
import { Wordmark } from '../components/ui/Wordmark'
import { Button } from '../components/ui/Button'

const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP', 'GHS', 'KES', 'ZAR']

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    const session = await queryClient.fetchQuery({
      queryKey: queryKeys.user.session,
      queryFn: fetchSession,
    })
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: '/onboarding' } })
    }
  },
  component: OnboardingPage,
})

function OnboardingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currency, setCurrency] = useState('NGN')
  const [saving, setSaving] = useState(false)

  const handleContinue = async () => {
    setSaving(true)
    try {
      await api.patch('/api/users/me/profile', { preferredCurrency: currency })
    } catch {
      // non-fatal — currency can be changed later
    } finally {
      setSaving(false)
      navigate({ to: '/budgets' })
    }
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col">
      <header className="px-6 py-6 flex items-center justify-between">
        <Wordmark />
        <span className="text-sm text-text-tertiary">{user?.name || user?.email}</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          <div className="card">
            <h2 className="font-heading text-3xl font-medium text-text-primary">Choose your currency</h2>
            <p className="text-text-secondary mt-2 mb-6">
              This is how your money will be displayed. You can change it later.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border text-sm font-medium transition-all ${
                    currency === c
                      ? 'border-forest bg-sage/20 text-forest'
                      : 'border-text-primary/10 text-text-secondary hover:bg-text-primary/5'
                  }`}
                >
                  {currency === c && <Check className="w-4 h-4" />}
                  {c}
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-end">
              <Button onClick={handleContinue} loading={saving}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
