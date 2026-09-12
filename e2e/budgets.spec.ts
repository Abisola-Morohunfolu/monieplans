import { test, expect } from '@playwright/test'

test('budget list shows the seeded budget name and cap', async ({ page }) => {
  await page.goto('/budgets')
  await expect(page.getByText('September 2026')).toBeVisible()
  await expect(page.getByText('₦1,000.00')).toBeVisible()
})

test('budget detail shows cap and planning mode', async ({ page }) => {
  await page.goto('/budgets')
  await page.getByRole('link', { name: /September 2026/ }).click()
  await expect(page.getByText('spending cap based')).toBeVisible()
  await expect(page.getByText('₦1,000.00')).toBeVisible()
})
