import { test, expect } from '@playwright/test';
test('Home has its own weekly overview', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/dashboard/);
  await expect(
    page.getByRole('heading', { name: 'This week, in reach.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Recent activity' }),
  ).toBeVisible();
});
