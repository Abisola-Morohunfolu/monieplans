import { type InputHTMLAttributes } from 'react'

export const inputClasses =
  'w-full py-3 px-4 rounded-xl border border-text-primary/12 bg-bg-lightest/60 font-sans text-sm leading-relaxed text-text-primary outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-tertiary focus:border-text-primary/20 focus:shadow-[0_0_0_2px_var(--color-bg-card),0_0_0_4px_rgba(142,156,117,0.6)]'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, id, className = '', ...props }: InputProps) {
  const input = <input id={id} className={`${inputClasses} ${className}`} {...props} />

  if (!label) return input

  return (
    <div className="mt-4">
      <label
        htmlFor={id}
        className="block mb-1.5 text-xs font-medium tracking-[0.01em] text-text-secondary"
      >
        {label}
      </label>
      {input}
    </div>
  )
}
