import { getErrorMessage } from '../../../lib/errors';
import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { User, Save, LogOut } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { api } from '../../../lib/api';
import { queryClient } from '../../../lib/queryClient';
import { queryKeys } from '../../../lib/queryKeys';
import type { UserProfile } from '../../../types';

const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP', 'GHS', 'KES', 'ZAR'];

export const Route = createFileRoute('/_authenticated/profile/')({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, refreshSession, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [preferredCurrency, setPreferredCurrency] = useState('NGN');
  const [timezone, setTimezone] = useState('');
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/users/me/profile')
      .then(({ data }) => {
        setProfile(data);
        setFullName(data.fullName ?? data.name ?? '');
        setPreferredCurrency(data.preferredCurrency || 'NGN');
        setTimezone(data.timezone || '');
      })
      .catch(() => {
        if (user) {
          setFullName(user.name || '');
        }
      });
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.patch('/api/users/me/profile', {
        fullName,
        preferredCurrency,
        timezone: timezone || undefined,
      });
      await refreshSession();
      queryClient.invalidateQueries({ queryKey: queryKeys.user.me });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setSaved(true);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <header>
        <h2 className="font-heading text-2xl sm:text-3xl font-medium text-text-primary">
          Profile & Settings
        </h2>
        <p className="text-text-secondary mt-1">
          Manage your account preferences.
        </p>
      </header>

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-sage/20 text-forest rounded-xl">
            <User className="w-5 h-5" />
          </div>
          <h3 className="font-heading text-xl font-semibold text-text-primary">
            Account Information
          </h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">
                Name
              </label>
              <input
                type="text"
                className="input-field"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">
                Email Address
              </label>
              <input
                type="email"
                className="input-field opacity-60 cursor-not-allowed"
                value={profile?.email ?? user?.email ?? ''}
                disabled
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">
                Preferred currency
              </label>
              <select
                className="input-field"
                value={preferredCurrency}
                onChange={(e) => setPreferredCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary">
                Timezone
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Africa/Lagos"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end items-center gap-3">
            {saved && <span className="text-xs text-sage">Profile saved!</span>}
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || signingOut}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
      <div className="border-t border-text-primary/15 pt-5">
        <button
          className="btn-secondary"
          disabled={saving || signingOut}
          onClick={async () => {
            setSigningOut(true);
            setError('');
            try {
              await signOut();
            } catch (error) {
              setError(getErrorMessage(error));
            } finally {
              setSigningOut(false);
            }
          }}
        >
          <LogOut size={18} />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}
