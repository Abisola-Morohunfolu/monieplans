import { createFileRoute } from '@tanstack/react-router'
import { Settings, User, Bell, Shield, Palette } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/profile/')({
  component: ProfilePage,
})

function ProfilePage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header>
        <h2 className="text-3xl font-bold">Profile & Settings</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your account preferences and application settings.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-2">
          <button className="w-full text-left px-4 py-3 bg-primary text-white rounded-xl font-medium flex items-center gap-3">
            <User className="w-5 h-5" /> Account Info
          </button>
          <button className="w-full text-left px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors flex items-center gap-3">
            <Bell className="w-5 h-5" /> Notifications
          </button>
          <button className="w-full text-left px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors flex items-center gap-3">
            <Palette className="w-5 h-5" /> Appearance
          </button>
          <button className="w-full text-left px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors flex items-center gap-3">
            <Shield className="w-5 h-5" /> Security
          </button>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="glass-card">
            <h3 className="text-xl font-bold mb-6">Account Information</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
                  M
                </div>
                <div>
                  <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    Change Avatar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-500">First Name</label>
                  <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/50" defaultValue="User" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-500">Last Name</label>
                  <input type="text" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/50" defaultValue="Name" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-slate-500">Email Address</label>
                  <input type="email" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-500 cursor-not-allowed" defaultValue="user@example.com" disabled />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button className="btn-primary">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
