import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

async function login(page: import('@playwright/test').Page) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', '123456');
  await page.click('button[type="submit"]');
  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 10000,
  });
}

async function logout(page: import('@playwright/test').Page) {
  // Find and click sign-out / logout button or link
  const signOutBtn = page.locator(
    'button:has-text("Sign out"), button:has-text("Logout"), a:has-text("Sign out"), a:has-text("Logout")',
  );
  if ((await signOutBtn.count()) > 0) {
    await signOutBtn.first().click();
    await page.waitForURL((url) => url.pathname.includes('/login'), {
      timeout: 10000,
    });
  } else {
    // Fallback: POST to signout API directly
    await page.goto(`${BASE}/api/auth/signout`);
    // Get CSRF token and submit the form
    const csrfInput = page.locator('input[name="csrfToken"]');
    if ((await csrfInput.count()) > 0) {
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname.includes('/login'), {
        timeout: 10000,
      });
    }
  }
}

test('login succeeds on second attempt after logout', async ({ page }) => {
  // First login
  await login(page);
  await expect(page).not.toHaveURL(/\/login/);
  await page.screenshot({ path: 'screenshots/login-1-ok.png' });

  // Logout
  await logout(page);

  // Second login (this was failing before the fix)
  await login(page);
  await expect(page).not.toHaveURL(/\/login/);
  await page.screenshot({ path: 'screenshots/login-2-ok.png' });
});
