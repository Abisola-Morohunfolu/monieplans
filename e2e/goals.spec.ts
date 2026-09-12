import { test, expect } from '@playwright/test'

test('goals list shows the seeded goal with naira amounts', async ({ page }) => {
  await page.goto('/goals')
  await expect(page.getByText('Emergency Fund')).toBeVisible()
  await expect(page.getByText('of ₦5,000.00')).toBeVisible()
})
