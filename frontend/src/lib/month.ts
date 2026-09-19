export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const d = new Date(year, (m ?? 1) - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function addMonths(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number)
  const d = new Date(year, (m ?? 1) - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
