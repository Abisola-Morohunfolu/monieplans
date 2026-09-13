import { test, expect } from '@playwright/test'

test('expenses list shows the seeded expense with a naira amount', async ({
  page,
}) => {
  await page.goto('/expenses')
  await expect(page.getByText('Groceries')).toBeVisible()
  await expect(page.getByText('-₦42.50')).toBeVisible()
})
