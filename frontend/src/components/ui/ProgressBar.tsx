interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  color?: 'sage' | 'rust'
}

export function ProgressBar({ value, max = 100, className = '', color = 'sage' }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0
  const barColor = color === 'rust' ? 'bg-rust' : 'bg-sage'

  return (
    <div className={`w-full bg-text-primary/8 rounded-full h-2 ${className}`}>
      <div
        className={`${barColor} h-2 rounded-full transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
