export function Divider({ label = 'or' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-text-primary/10" aria-hidden="true" />
      <span className="text-xs leading-none text-text-tertiary">{label}</span>
      <div className="flex-1 h-px bg-text-primary/10" aria-hidden="true" />
    </div>
  )
}
