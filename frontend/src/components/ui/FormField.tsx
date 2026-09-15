import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  children: ReactNode
  hint?: string
}

export function FormField({ label, children, hint }: FormFieldProps) {
  return (
    <div>
      <label className="block mb-1.5 text-xs font-medium tracking-[0.01em] text-text-secondary">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-text-tertiary">{hint}</p>}
    </div>
  )
}
