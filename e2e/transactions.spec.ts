import { test, expect } from '@playwright/test'

test('transactions list shows the seeded expense and income', async ({
  page,
}) => {
  await page.goto('/transactions')
  await expect(
    page.getByRole('heading', { name: 'Transactions' }),
  ).toBeVisible()
  await expect(page.getByText('Groceries')).toBeVisible()
  await expect(page.getByText('Salary')).toBeVisible()
  await expect(page.getByText(/42\.50/)).toBeVisible()
})
