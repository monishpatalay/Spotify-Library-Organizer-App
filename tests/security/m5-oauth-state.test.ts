// M5: login must carry an unguessable OAuth state that the callback verifies
// before exchanging the code (prevents login CSRF).
import test from 'node:test';
import assert from 'node:assert/strict';
import { useTestApp } from '../helpers/mockHttp';

const ctx = useTestApp();
const tokenCalls = () => ctx.calls.filter((c) => c.url.includes('/api/token')).length;
const tokenOk = (c: { url: string }) => c.url.includes('/api/token')
  ? { status: 200, body: { access_token: 'user:alice', refresh_token: 'RT', expires_in: 3600 } } : undefined;

async function startLogin() {
  const res = await ctx.app.get('/api/auth/login');
  const state = new URL(res.headers.get('location')!).searchParams.get('state') ?? '';
  const cookie = (res.headers.getSetCookie().find((c) => c.startsWith('sp_oauth_state=')) ?? '').split(';')[0];
  return { state, cookie };
}
const callback = (query: string, cookie?: string) =>
  fetch(`${ctx.app.base}/api/auth/callback?${query}`, { redirect: 'manual', headers: cookie ? { Cookie: cookie } : {} });

test('[M5] login sends an unguessable state and stores it in an HttpOnly cookie', async () => {
  const a = await startLogin();
  const b = await startLogin();
  assert.ok(a.state.length >= 32 && a.state !== b.state, 'state must be random per login');
  assert.ok(a.cookie.includes(a.state));
});

test('[M5] a callback without the matching state is rejected before the code is exchanged', async () => {
  ctx.handler = tokenOk;
  const { state, cookie } = await startLogin();
  for (const [query, c] of [
    ['code=attacker', undefined],                      // forged link, no state at all
    [`code=attacker&state=${state}`, undefined],       // victim's browser never started this login
    ['code=attacker&state=wrong', cookie],             // state mismatch
  ] as const) {
    const res = await callback(query, c);
    assert.match(res.headers.get('location') ?? '', /\?error=/, query);
  }
  assert.equal(tokenCalls(), 0);
});

test('[M5] the matching state completes the login and clears the state cookie', async () => {
  ctx.handler = tokenOk;
  const { state, cookie } = await startLogin();
  const res = await callback(`code=abc&state=${state}`, cookie);
  assert.match(res.headers.get('location') ?? '', /\/callback#access_token=/);
  assert.equal(tokenCalls(), 1);
  assert.ok(res.headers.getSetCookie().some((c) => c.startsWith('sp_oauth_state=;')), 'state cookie is one-time');
});
