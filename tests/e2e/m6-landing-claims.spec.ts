import { test, expect } from '@playwright/test';

// M6: the app creates playlists, so the landing page must not promise "read-only".
test('[M6] the landing page describes what the app actually does with Spotify data', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/read-only/i)).toHaveCount(0);
  await expect(page.getByText(/never modify/i)).toHaveCount(0);
  await expect(page.getByText(/creates new private playlists/i)).toBeVisible();
});
