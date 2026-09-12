import { test, expect } from '@playwright/test'

test('fixed expenses list shows the seeded template with a naira amount', async ({
  page,
}) => {
  await page.goto('/fixed-expenses')
  await expect(page.getByText('Rent')).toBeVisible()
  await expect(page.getByText('₦1,200.00')).toBeVisible()
})
