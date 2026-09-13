import { test, expect } from '@playwright/test'

test('dashboard renders its sections for an authenticated user', async ({
  page,
}) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('Active Budget Cap')).toBeVisible()
  await expect(page.getByText('Total Expenses')).toBeVisible()
  await expect(page.getByText('AI Recommendations')).toBeVisible()
  await expect(page.getByText('Recent Transactions')).toBeVisible()
})

test('each authenticated page renders its heading', async ({ page }) => {
  const routes: { path: string; heading: string }[] = [
    { path: '/budgets', heading: 'Budgets' },
    { path: '/expenses', heading: 'Expenses' },
    { path: '/fixed-expenses', heading: 'Fixed Expenses' },
    { path: '/goals', heading: 'Financial Goals' },
    { path: '/statements', heading: 'Statements' },
    { path: '/profile', heading: 'Profile & Settings' },
  ]

  for (const { path, heading } of routes) {
    await page.goto(path)
    await expect(
      page.getByRole('heading', { name: heading, exact: true }),
    ).toBeVisible()
  }
})
