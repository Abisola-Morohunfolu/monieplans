import { useState } from 'react'
import { signIn } from '../../lib/auth'

const Spinner = () => (
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
)

export function OAuthButtons() {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | null>(null)
  const [error, setError] = useState('')

  const handleOAuth = async (provider: 'google' | 'github') => {
    if (loadingProvider) return
    setLoadingProvider(provider)
    setError('')
    try {
      await signIn.social({
        provider,
        callbackURL: '/dashboard',
      })
    } catch {
      setError(`Failed to sign in with ${provider === 'google' ? 'Google' : 'GitHub'}.`)
      setLoadingProvider(null)
    }
  }

  return (
    <>
      <div className="mt-8 flex flex-col gap-3">
        <button
          type="button"
          className="flex items-center justify-center gap-2.5 w-full py-[13px] px-4 rounded-full font-sans text-[15px] font-medium leading-none cursor-pointer border-none transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] bg-text-primary text-bg-base hover:translate-y-[-2px] hover:scale-[1.03] hover:bg-forest active:scale-95 focus-visible:outline-2 focus-visible:outline-forest focus-visible:outline-offset-3 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          onClick={() => handleOAuth('github')}
          disabled={loadingProvider !== null}
          aria-label="Continue with GitHub"
        >
          {loadingProvider === 'github' ? (
            <Spinner />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
          )}
          <span>Continue with GitHub</span>
        </button>

        <button
          type="button"
          className="flex items-center justify-center gap-2.5 w-full py-[13px] px-4 rounded-full font-sans text-[15px] font-medium leading-none cursor-pointer transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] bg-transparent border border-text-primary/15 text-text-primary hover:translate-y-[-2px] hover:scale-[1.03] hover:bg-text-primary/5 active:scale-95 focus-visible:outline-2 focus-visible:outline-forest focus-visible:outline-offset-3 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          onClick={() => handleOAuth('google')}
          disabled={loadingProvider !== null}
          aria-label="Continue with Google"
        >
          {loadingProvider === 'google' ? (
            <Spinner />
          ) : (
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
          )}
          <span>Continue with Google</span>
        </button>
      </div>

      {error && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-[13px] font-medium leading-relaxed text-rust" role="alert">
          {error}
        </p>
      )}
    </>
  )
}
