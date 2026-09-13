import { test, expect } from '@playwright/test'

test('dashboard shows seeded budget cap and expenses', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('Active Budget Cap')).toBeVisible()
  await expect(page.getByText('Total Expenses')).toBeVisible()
  await expect(page.getByText('₦1,000.00')).toBeVisible()
  await expect(page.getByText('Groceries')).toBeVisible()
})
