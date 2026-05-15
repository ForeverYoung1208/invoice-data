import { test, expect } from '@playwright/test';
import { login } from '../utils/authHelpers';

test('Protected route redirects unauthenticated users to login', async ({
  page,
}) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.locator('[data-slot="card-title"]', { hasText: 'Sign in' }),
  ).toBeVisible();
});

test('Authenticated user can access protected route', async ({ page }) => {
  await login(page);
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText('Tasks')).toBeVisible();
});
