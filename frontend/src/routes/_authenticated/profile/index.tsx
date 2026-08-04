import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { User, Bell, Shield, Palette } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { api } from '../../../lib/api'
import type { UserProfile } from '../../../types'

export const Route = createFileRoute('/_authenticated/profile/')({
  component: ProfilePage,
})

function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile>({ name: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get('/api/users/me/profile').then(({ data }) => {
      setProfile({ name: data.name || '', email: data.email || '' })
    }).catch(() => {
      if (user) {
        setProfile({ name: user.name || '', email: user.email || '' })
      }
    })
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await api.patch('/api/users/me/profile', profile)
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
          <button className="w-full text-left px-4 py-3 text-text-secondary hover:bg-text-primary/5 rounded-2xl font-medium transition-colors flex items-center gap-3 text-sm">
            <Bell className="w-5 h-5" /> Notifications
          </button>
          <button className="w-full text-left px-4 py-3 text-text-secondary hover:bg-text-primary/5 rounded-2xl font-medium transition-colors flex items-center gap-3 text-sm">
            <Palette className="w-5 h-5" /> Appearance
          </button>
          <button className="w-full text-left px-4 py-3 text-text-secondary hover:bg-text-primary/5 rounded-2xl font-medium transition-colors flex items-center gap-3 text-sm">
            <Shield className="w-5 h-5" /> Security
          </button>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="card">
            <h3 className="font-heading text-xl font-semibold mb-6 text-text-primary">Account Information</h3>

            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-sage flex items-center justify-center text-white text-2xl font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || 'M'}
                </div>
                <div>
                  <button className="px-4 py-2 bg-text-primary/5 rounded-2xl text-sm font-medium hover:bg-text-primary/10 transition-colors">
                    Change Avatar
                  </button>
                </div>
              </div>

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

              <div className="pt-4 flex justify-end items-center gap-3">
                {saved && <span className="text-xs text-sage">Profile saved!</span>}
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
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
