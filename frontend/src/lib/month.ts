export function todayInput(timezone = 'Africa/Lagos'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export function currentMonth(timezone = 'Africa/Lagos'): string {
  return todayInput(timezone).slice(0, 7);
}

export function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, (m ?? 1) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function addMonths(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, (m ?? 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
