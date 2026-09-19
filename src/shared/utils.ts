export function generateId(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function monthRange(month: string): {
  start: string;
  nextStart: string;
} {
  const [year, m] = month.split('-').map(Number);
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? year + 1 : year;
  return {
    start: `${month}-01`,
    nextStart: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`,
  };
}
