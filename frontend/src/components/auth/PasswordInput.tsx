import { forwardRef, useState, type InputHTMLAttributes } from 'react'

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label = 'Password', id, className = '', ...props }, ref) => {
    const [show, setShow] = useState(false)
    const inputId = id || 'password'

    return (
      <div className="mt-4">
        <label
          htmlFor={inputId}
          className="block mb-1.5 text-xs font-medium tracking-[0.01em] text-text-secondary"
        >
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={show ? 'text' : 'password'}
            autoComplete={props.autoComplete || 'current-password'}
            className={`w-full py-3 px-4 pr-12 rounded-xl border border-text-primary/12 bg-bg-lightest/60 font-sans text-sm leading-relaxed text-text-primary outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-tertiary focus:border-text-primary/20 focus:shadow-[0_0_0_2px_var(--color-bg-card),0_0_0_4px_rgba(142,156,117,0.6)] ${className}`}
            {...props}
          />
          <button
            type="button"
            onClick={() => {
              setShow((s) => !s)
              setTimeout(() => {
                const el = document.getElementById(inputId)
                if (el) (el as HTMLInputElement).focus()
              })
            }}
            className="absolute top-0 right-1 bottom-0 flex items-center px-3 bg-transparent border-none cursor-pointer text-text-tertiary transition-colors duration-200 hover:text-text-secondary focus-visible:outline-2 focus-visible:outline-sage focus-visible:-outline-offset-2 focus-visible:rounded-lg"
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
          >
            {show ? (
              <svg
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
                <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
                <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
                <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
                <path d="m2 2 20 20" />
              </svg>
            ) : (
              <svg
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
                <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>
    )
  },
)

PasswordInput.displayName = 'PasswordInput'
