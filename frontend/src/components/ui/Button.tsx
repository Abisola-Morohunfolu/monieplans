import { type ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

type Variant = 'solid' | 'outline'
type Size = 'sm' | 'md'

const VARIANT_CLASSES: Record<Variant, string> = {
  solid: 'bg-text-primary text-bg-base hover:bg-forest',
  outline:
    'border border-text-primary/15 bg-transparent text-text-primary hover:bg-text-primary/5',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-4 py-[13px] text-sm font-semibold',
  md: 'px-4 py-[13px] text-[15px] font-medium',
}

const INTERACTION =
  'hover:-translate-y-0.5 hover:scale-[1.03] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  variant = 'solid',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2.5 rounded-full font-sans leading-none cursor-pointer transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)] focus-visible:outline-2 focus-visible:outline-forest focus-visible:outline-offset-3 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${INTERACTION} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-disabled={disabled || loading || undefined}
      {...props}
    >
      {loading && <Spinner size={16} />}
      {children}
    </button>
  )
}
