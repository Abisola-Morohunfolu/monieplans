import { test, expect } from '@playwright/test'

test('unauthenticated access to /dashboard redirects to /login', async ({
  page,
}) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await expect(page.getByText('Welcome back to your')).toBeVisible()
})
