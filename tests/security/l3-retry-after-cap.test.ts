// L3: the client must not silently wait out an arbitrarily long Retry-After.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mockHttp } from '../helpers/mockHttp';

(globalThis as any).localStorage = { getItem: () => 'AT', setItem: () => {}, removeItem: () => {} };
const http = mockHttp(() => ({ status: 429, body: {}, headers: { 'Retry-After': '3600' } }));
after(() => http.restore());

import { apiFetch } from '../../client/src/utils/spotifyApi';

test('[L3] a 1-hour Retry-After is returned as a 429 instead of stalling the scan', async () => {
  const start = Date.now();
  const res = await Promise.race([
    apiFetch('/api/spotify/liked-songs'),
    new Promise<'stalled'>((r) => setTimeout(() => r('stalled'), 3000).unref()),
  ]);
  assert.notEqual(res, 'stalled', 'apiFetch is still waiting on the 1-hour Retry-After');
  assert.equal((res as Response).status, 429);
  assert.ok(Date.now() - start < 3000);
});
