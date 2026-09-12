export function formatCurrency(
  amount: number,
  currency: string = 'NGN',
): string {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString('en-NG')}`
  }
}
