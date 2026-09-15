import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Wallet } from 'lucide-react'
import { fetchSession } from '../hooks/useSession'
import { useCreateBudget } from '../hooks/useBudgets'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import { queryClient } from '../lib/queryClient'
import { queryKeys } from '../lib/queryKeys'
import { Wordmark } from '../components/ui/Wordmark'
import { Button } from '../components/ui/Button'

const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP', 'GHS', 'KES', 'ZAR']

function toDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function currentMonthRange(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start: toDateInput(start), end: toDateInput(end) }
}

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    const session = await queryClient.fetchQuery({
      queryKey: queryKeys.user.session,
      queryFn: fetchSession,
    })
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: '/onboarding' } })
    }
    const { data } = await api.get<{ data: unknown[] }>('/api/budgets')
    if (data.data && data.data.length > 0) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: OnboardingPage,
})

function OnboardingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const createBudget = useCreateBudget()

  const [step, setStep] = useState(0)
  const [currency, setCurrency] = useState('NGN')
  const [savingCurrency, setSavingCurrency] = useState(false)

  const [planningMode, setPlanningMode] = useState<'income_based' | 'spending_cap_based'>('income_based')
  const [amount, setAmount] = useState('')

  const { start, end } = currentMonthRange()

  const handleCurrencyNext = async () => {
    setSavingCurrency(true)
    try {
      await api.patch('/api/users/me/profile', { preferredCurrency: currency })
    } catch {
      // non-fatal — currency can be changed later
    } finally {
      setSavingCurrency(false)
      setStep(1)
    }
  }

  const handleCreateBudget = async () => {
    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount <= 0) return

    const payload =
      planningMode === 'income_based'
        ? { monthlyIncomeAmount: numericAmount }
        : { monthlyBudgetCapAmount: numericAmount }

    await createBudget.mutateAsync({
      periodStartDate: start,
      periodEndDate: end,
      planningMode,
      currency,
      activateImmediately: true,
      ...payload,
    })

    navigate({ to: '/dashboard' })
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col">
      <header className="px-8 py-6 flex items-center justify-between">
        <Wordmark />
        <span className="text-sm text-text-tertiary">
          {user?.name || user?.email}
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          <div className="flex items-center gap-2 mb-8 justify-center">
            {[0, 1].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i <= step ? 'w-8 bg-forest' : 'w-8 bg-text-primary/10'
                }`}
              />
            ))}
          </div>

          {step === 0 && (
            <div className="card">
              <h2 className="font-heading text-3xl font-medium text-text-primary">
                Choose your currency
              </h2>
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
                <Button onClick={handleCurrencyNext} loading={savingCurrency}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="card">
              <h2 className="font-heading text-3xl font-medium text-text-primary">
                Set up your budget
              </h2>
              <p className="text-text-secondary mt-2 mb-6">
                We'll create a budget for this month so you can start tracking right away.
              </p>

              <div className="space-y-2 mb-6">
                <label className="text-xs font-medium text-text-secondary">Planning mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPlanningMode('income_based')}
                    className={`text-left p-4 rounded-2xl border transition-all ${
                      planningMode === 'income_based'
                        ? 'border-forest bg-sage/20'
                        : 'border-text-primary/10 hover:bg-text-primary/5'
                    }`}
                  >
                    <p className="text-sm font-semibold">Income based</p>
                    <p className="text-xs text-text-tertiary mt-1">Plan from what you earn</p>
                  </button>
                  <button
                    onClick={() => setPlanningMode('spending_cap_based')}
                    className={`text-left p-4 rounded-2xl border transition-all ${
                      planningMode === 'spending_cap_based'
                        ? 'border-forest bg-sage/20'
                        : 'border-text-primary/10 hover:bg-text-primary/5'
                    }`}
                  >
                    <p className="text-sm font-semibold">Spending cap</p>
                    <p className="text-xs text-text-tertiary mt-1">Set a monthly limit</p>
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block mb-1.5 text-xs font-medium text-text-secondary">
                  {planningMode === 'income_based' ? 'Monthly income' : 'Monthly cap'} ({currency})
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full py-3 px-4 rounded-xl border border-text-primary/12 bg-bg-lightest/60 text-lg font-medium outline-none focus:border-text-primary/20"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-text-tertiary mb-8">
                <Wallet className="w-4 h-4" />
                Period: {start} – {end}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep(0)}
                  className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <Button
                  onClick={handleCreateBudget}
                  loading={createBudget.isPending}
                  disabled={!amount || Number(amount) <= 0}
                >
                  Create budget <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
