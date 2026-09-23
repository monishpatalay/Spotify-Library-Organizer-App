import { test, expect } from '@playwright/test';

// L9: the landing page must not display attacker-chosen text from ?error=.
test('[L9] an arbitrary ?error= message is not shown on the landing page', async ({ page }) => {
  const phishing = 'Your account is locked. Call +1-555-0100 to restore it';
  await page.goto(`/?error=${encodeURIComponent(phishing)}`);
  await expect(page.getByText('Call +1-555-0100')).toHaveCount(0);
  await expect(page.getByText(/couldn.t log you in/i)).toBeVisible();
});

test('[L9] known error codes get a fixed, friendly message', async ({ page }) => {
  await page.goto('/?error=session_expired');
  await expect(page.getByText(/session expired/i)).toBeVisible();
});
