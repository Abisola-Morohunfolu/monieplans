import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { User, Bell, Shield, Palette, Save } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { api } from '../../../lib/api'
import { queryClient } from '../../../lib/queryClient'
import { queryKeys } from '../../../lib/queryKeys'
import type { UserProfile } from '../../../types'

const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP', 'GHS', 'KES', 'ZAR']
const WEEK_STARTS = ['monday', 'sunday', 'saturday']

export const Route = createFileRoute('/_authenticated/profile/')({
  component: ProfilePage,
})

function ProfilePage() {
  const { user, refreshSession } = useAuth()
  const [profile, setProfile] = useState<UserProfile>({ name: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api
      .get('/api/users/me/profile')
      .then(({ data }) => {
        setProfile({
          name: data.name || '',
          email: data.email || '',
          preferredCurrency: data.preferredCurrency || 'NGN',
          timezone: data.timezone || '',
          weekStartDay: data.weekStartDay || 'monday',
        })
      })
      .catch(() => {
        if (user) {
          setProfile({ name: user.name || '', email: user.email || '' })
        }
      })
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await api.patch('/api/users/me/profile', {
        name: profile.name,
        preferredCurrency: profile.preferredCurrency,
        timezone: profile.timezone || undefined,
        weekStartDay: profile.weekStartDay,
      })
      await refreshSession()
      queryClient.invalidateQueries({ queryKey: queryKeys.user.me })
      setSaved(true)
    } catch {
      // handle error
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header>
        <h2 className="font-heading text-3xl font-medium text-text-primary">Profile & Settings</h2>
        <p className="text-text-secondary mt-1">Manage your account preferences and application settings.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-1.5">
          <button className="w-full text-left px-4 py-3 bg-sage/20 text-forest rounded-2xl font-medium flex items-center gap-3 text-sm">
            <User className="w-5 h-5" /> Account Info
          </button>
          <button className="w-full text-left px-4 py-3 text-text-secondary hover:bg-text-primary/5 rounded-2xl font-medium transition-colors flex items-center gap-3 text-sm" title="Coming soon">
            <Bell className="w-5 h-5" /> Notifications
          </button>
          <button className="w-full text-left px-4 py-3 text-text-secondary hover:bg-text-primary/5 rounded-2xl font-medium transition-colors flex items-center gap-3 text-sm" title="Coming soon">
            <Palette className="w-5 h-5" /> Appearance
          </button>
          <button className="w-full text-left px-4 py-3 text-text-secondary hover:bg-text-primary/5 rounded-2xl font-medium transition-colors flex items-center gap-3 text-sm" title="Coming soon">
            <Shield className="w-5 h-5" /> Security
          </button>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="card">
            <h3 className="font-heading text-xl font-semibold mb-6 text-text-primary">Account Information</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-secondary">Name</label>
                  <input
                    type="text"
                    className="input-field"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-secondary">Email Address</label>
                  <input
                    type="email"
                    className="input-field opacity-60 cursor-not-allowed"
                    value={profile.email}
                    disabled
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-secondary">Preferred currency</label>
                  <select
                    className="input-field"
                    value={profile.preferredCurrency || 'NGN'}
                    onChange={(e) => setProfile({ ...profile, preferredCurrency: e.target.value })}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-secondary">Week starts on</label>
                  <select
                    className="input-field"
                    value={profile.weekStartDay || 'monday'}
                    onChange={(e) => setProfile({ ...profile, weekStartDay: e.target.value })}
                  >
                    {WEEK_STARTS.map((w) => (
                      <option key={w} value={w}>
                        {w[0].toUpperCase() + w.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-secondary">Timezone</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Africa/Lagos"
                  value={profile.timezone || ''}
                  onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                />
              </div>

              <div className="pt-4 flex justify-end items-center gap-3">
                {saved && <span className="text-xs text-sage">Profile saved!</span>}
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
