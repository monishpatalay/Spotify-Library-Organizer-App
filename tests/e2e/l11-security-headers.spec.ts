import { test, expect } from '@playwright/test';
import { mockApi, login } from './fixtures';

// L11: the app must keep working under the production security headers
// (vite preview serves the same headers as vercel.json, see vite.config.ts).
test('[L11] pages are served with the CSP and run without CSP violations', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) violations.push(m.text()); });

  const res = await page.goto('/');
  expect(res?.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  await mockApi(page, { aiFailuresLeft: 0, playlistBodies: [] });
  await login(page, 'alice');
  await page.getByRole('button', { name: 'Scan Liked Songs' }).click();
  await expect(page.getByText('Alice Party Anthem')).toBeVisible();
  expect(violations).toEqual([]);
});
