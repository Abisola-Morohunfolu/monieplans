import { test, expect } from '@playwright/test'

test('dashboard redirects to the budget page', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/budgets/)
  await expect(page.getByRole('heading', { name: 'Budget' })).toBeVisible()
})
