import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-sage/20 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-sage" />
      </div>
      <h3 className="font-heading text-xl font-semibold mb-2 text-text-primary">{title}</h3>
      {description && <p className="text-text-secondary max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  )
}
