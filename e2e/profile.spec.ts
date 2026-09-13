import { test, expect } from '@playwright/test'

test('updating the profile name persists and shows confirmation', async ({
  page,
}) => {
  const newName = `E2E ${Date.now()}`

  await page.goto('/profile')
  await expect(
    page.getByRole('heading', { name: 'Profile & Settings' }),
  ).toBeVisible()

  const nameInput = page.locator('input[type="text"]').first()
  await nameInput.fill(newName)

  await page.getByRole('button', { name: 'Save Changes' }).click()

  await expect(page.getByText('Profile saved!')).toBeVisible()

  await page.reload()
  await expect(page.locator('input[type="text"]').first()).toHaveValue(newName)
})
