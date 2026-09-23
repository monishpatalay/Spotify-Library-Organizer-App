import { test, expect } from '@playwright/test';
import { mockApi, login } from './fixtures';

test('login → scan library → AI tags are shown', async ({ page }) => {
  await mockApi(page, { aiFailuresLeft: 0, playlistBodies: [] });
  await login(page, 'alice');
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('button', { name: 'Scan Liked Songs' }).click();
  await expect(page.getByText('Alice Party Anthem')).toBeVisible();
  await expect(page.getByText('punjabi').first()).toBeVisible();
  await expect(page.getByText('party', { exact: true }).first()).toBeVisible();
});

test('prompt → preview → create playlist sends only the matched tracks', async ({ page }) => {
  const api = { aiFailuresLeft: 0, playlistBodies: [] as any[] };
  await mockApi(page, api);
  await login(page, 'alice');
  await page.getByRole('button', { name: 'Scan Liked Songs' }).click();
  await expect(page.getByText('party', { exact: true }).first()).toBeVisible();
  await page.getByPlaceholder('Describe the playlist you want…').fill('party songs');
  await page.getByRole('button', { name: /Generate Playlist Preview/ }).click();
  await expect(page.getByText('Playlist Preview')).toBeVisible();
  await page.getByRole('button', { name: /Create Spotify Playlist/ }).click();
  await expect(page.getByRole('link', { name: /open/i }).first()).toBeVisible();
  expect(api.playlistBodies).toHaveLength(1);
  expect(api.playlistBodies[0].name).toBe('Party Mix');
  expect(api.playlistBodies[0].trackUris.sort()).toEqual(['spotify:track:alice0', 'spotify:track:alice1']);
});

test('AI tagging failure shows an error with a working Retry', async ({ page }) => {
  await mockApi(page, { aiFailuresLeft: 1, playlistBodies: [] });
  await login(page, 'alice');
  await page.getByRole('button', { name: 'Scan Liked Songs' }).click();
  await expect(page.getByText(/AI tagging unavailable/)).toBeVisible();
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('punjabi').first()).toBeVisible();
  await expect(page.getByText(/AI tagging unavailable/)).toHaveCount(0);
});
