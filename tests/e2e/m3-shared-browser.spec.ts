import { test, expect } from '@playwright/test';
import { mockApi, login } from './fixtures';

test('[M3] after logout, the next user on the same browser does not see the previous library', async ({ page }) => {
  await mockApi(page, { aiFailuresLeft: 0, playlistBodies: [] });
  await login(page, 'alice');
  await page.getByRole('button', { name: 'Scan Liked Songs' }).click();
  await expect(page.getByText('Alice Secret Song')).toBeVisible();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/$/);

  await login(page, 'bob');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('bob@example.com')).toBeVisible();
  await expect(page.getByText('Alice Secret Song'), 'Bob can see Alice\'s cached library').toHaveCount(0);
});
