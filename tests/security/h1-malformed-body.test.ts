// H1: a malformed request body must get a 4xx, never crash the server process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { useTestApp, newUser, statusOf } from '../helpers/mockHttp';

const ctx = useTestApp();
const noCrash = () => assert.equal(ctx.unhandled.length, 0, `unhandled rejection: ${ctx.unhandled[0]}`);

test('[H1] a non-string prompt gets a 400, not a crashed server', async () => {
  assert.equal(await statusOf(ctx.app.post('/api/ai/parse-prompt', { prompt: 123 }, newUser())), 400);
  noCrash();
});

test('[H1] a non-array trackUris gets a 400, not a crashed server', async () => {
  ctx.handler = (c) => c.url.endsWith('/me/playlists') ? { status: 201, body: { id: 'p' } } : undefined;
  assert.equal(await statusOf(ctx.app.post('/api/spotify/playlist', { name: 'x', trackUris: 'abc', accessToken: 'user:a' }, 'user:a')), 400);
  noCrash();
});
