// H2: tokens must not travel in the redirect URL's query string, and the
// long-lived refresh token must live only in an HttpOnly cookie.
import test from 'node:test';
import assert from 'node:assert/strict';
import { useTestApp } from '../helpers/mockHttp';

const ctx = useTestApp();
const tokenOk = (c: { url: string }) => c.url.includes('/api/token')
  ? { status: 200, body: { access_token: 'user:alice-AT-secret', refresh_token: 'RT-secret', expires_in: 3600 } } : undefined;

test('[H2] the callback redirect carries no refresh token and no token in the query string', async () => {
  ctx.handler = tokenOk;
  const res = await ctx.app.login('abc');
  const location = new URL(res.headers.get('location') ?? '');
  assert.ok(!location.href.includes('RT-secret'), 'refresh token leaked in redirect');
  assert.ok(!location.search.includes('AT-secret'), 'access token in the query string (sent to servers and logs)');
});

test('[H2] the refresh token is set as an HttpOnly cookie scoped to /api/auth', async () => {
  ctx.handler = tokenOk;
  const res = await ctx.app.login('abc');
  const cookie = res.headers.getSetCookie().find((c) => c.includes('RT-secret')) ?? '';
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Path=\/api\/auth/i);
  assert.match(cookie, /SameSite=Lax/i);
});

test('[H2] refresh reads the cookie and ignores a refresh token sent in the body', async () => {
  const sent: string[] = [];
  ctx.handler = (c) => {
    if (!c.url.includes('/api/token')) return undefined;
    sent.push(new URLSearchParams(c.body as string).get('refresh_token') ?? '');
    return { status: 200, body: { access_token: 'user:alice', expires_in: 3600 } };
  };
  const fromBody = await ctx.app.post('/api/auth/refresh', { refresh_token: 'stolen' });
  assert.equal(fromBody.status, 401);
  const fromCookie = await fetch(`${ctx.app.base}/api/auth/refresh`, { method: 'POST', headers: { Cookie: 'sp_refresh=RT-cookie' } });
  assert.equal(fromCookie.status, 200);
  assert.deepEqual(sent, ['RT-cookie']);
});

test('[H2] logout clears the refresh cookie', async () => {
  const res = await ctx.app.post('/api/auth/logout', {});
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith('sp_refresh=')) ?? '';
  assert.match(cookie, /Expires=Thu, 01 Jan 1970/i);
});
