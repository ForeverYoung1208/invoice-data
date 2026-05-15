import { Page } from '@playwright/test';

export async function login(page: Page) {
  await page.goto('/login');
  await page.fill('#username', 'admin');
  await page.fill('#password', '123456');
  await page.click('button[type=submit]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 10000,
  });
}
