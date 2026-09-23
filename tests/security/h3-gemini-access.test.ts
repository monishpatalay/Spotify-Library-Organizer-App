// H3: Gemini-backed routes must only serve users who logged in through this app,
// and must not forward oversized fields to Gemini.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { useTestApp, newUser, statusOf, classifyAll, isGemini } from '../helpers/mockHttp';

const ctx = useTestApp();
const track = () => ({ id: `t-${randomUUID()}`, name: 'x', artist: 'y' });
const bearerOnly = (path: string, body: unknown, token: string) => fetch(`${ctx.app.base}${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify(body),
});

test('[H3] a valid Spotify token without this app\'s session cookie is rejected', async () => {
  ctx.handler = classifyAll(['happy']);
  // "user:someone" is a token Spotify accepts (e.g. issued to another app), but no login happened here.
  for (const path of ['/api/ai/classify', '/api/ai/parse-prompt', '/api/lastfm/tags/batch', '/api/classify/language']) {
    assert.equal((await bearerOnly(path, { tracks: [track()], prompt: 'x' }, 'user:someone')).status, 401, path);
  }
  assert.equal(ctx.calls.filter(isGemini).length, 0);
});

test('[H3] a forged or tampered session cookie is rejected', async () => {
  const res = await fetch(`${ctx.app.base}/api/ai/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: 'sp_session=eyJ1IjoiYWRtaW4ifQ.forged' },
    body: JSON.stringify({ tracks: [track()] }),
  });
  assert.equal(res.status, 401);
});

test('[H3] logging in through the callback issues an HttpOnly session cookie', async () => {
  ctx.handler = (c) => c.url.includes('/api/token') ? { status: 200, body: { access_token: 'user:alice', refresh_token: 'RT', expires_in: 3600 } } : undefined;
  const res = await ctx.app.get('/api/auth/callback?code=abc');
  const session = res.headers.getSetCookie().find((c) => c.startsWith('sp_session=')) ?? '';
  assert.match(session, /HttpOnly/i);
  assert.match(session, /Path=\/api/i);
});

test('[H3] classify rejects oversized album/tag fields before they reach Gemini', async () => {
  ctx.handler = classifyAll(['happy']);
  const huge = [{ ...track(), album: 'a'.repeat(50_000), tags: ['t'.repeat(20_000)] }];
  assert.equal(await statusOf(ctx.app.post('/api/ai/classify', { tracks: huge }, newUser())), 400);
  assert.equal(ctx.calls.filter(isGemini).length, 0);
});
