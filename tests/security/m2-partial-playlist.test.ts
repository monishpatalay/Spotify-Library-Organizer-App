// M2: when adding tracks fails partway, the response must still identify the
// playlist that now exists in the user's account and how many tracks it has.
import test from 'node:test';
import assert from 'node:assert/strict';
import { useTestApp } from '../helpers/mockHttp';

const ctx = useTestApp();
const uris = Array.from({ length: 150 }, (_, i) => `spotify:track:${String(i).padStart(22, '0')}`);
const failSecondBatch = (status: number) => {
  let adds = 0;
  return (c: { url: string }) => c.url.endsWith('/me/playlists') ? { status: 201, body: { id: 'half' } }
    : c.url.endsWith('/tracks') ? (adds++ === 0 ? { status: 201, body: {} } : { status, body: {} }) : undefined;
};

test('[M2] a playlist that fails halfway is reported with its ID and progress, not orphaned', async () => {
  ctx.handler = failSecondBatch(500);
  const res = await ctx.app.post('/api/spotify/playlist', { name: 'x', trackUris: uris, accessToken: 'user:a' }, 'user:a');
  const body = await res.json();
  assert.equal(body.playlistId, 'half', `response hides the half-filled playlist: ${JSON.stringify(body)}`);
  assert.deepEqual([body.added, body.total], [100, 150]);
  assert.deepEqual(body.trackUris, uris.slice(100), 'the tracks still missing, so the user can add them');
});

test('[M2] a quota block partway reports only the tracks that were not added', async () => {
  ctx.handler = failSecondBatch(403);
  const body = await (await ctx.app.post('/api/spotify/playlist', { name: 'x', trackUris: uris, accessToken: 'user:a' }, 'user:a')).json();
  assert.equal(body.quota_blocked, true);
  assert.deepEqual([body.added, body.total, body.trackUris.length], [100, 150, 50]);
});
