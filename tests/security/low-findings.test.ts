// Regression tests for the Low-severity findings in SECURITY_AUDIT.md (L1–L11).
import test from 'node:test';
import assert from 'node:assert/strict';
import { useTestApp } from '../helpers/mockHttp';

const ctx = useTestApp();

function captureLogs() {
  const lines: string[] = [];
  const orig = { log: console.log, error: console.error };
  console.log = console.error = (...a: unknown[]) => { lines.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); };
  return { text: () => lines.join('\n'), restore: () => Object.assign(console, orig) };
}

test('[L1] the OAuth callback logs neither the authorization code nor token material', async () => {
  const logs = captureLogs();
  try {
    ctx.handler = (c) => c.url.includes('/api/token') ? { status: 400, body: { error: 'invalid_grant', error_description: 'secret-detail' } } : undefined;
    await ctx.app.login('one-time-code-123');
    ctx.handler = (c) => c.url.includes('/api/token') ? { status: 200, body: { access_token: 'user:alice', refresh_token: 'RT-xyz', expires_in: 3600 } } : undefined;
    await ctx.app.login('another-code-456');
  } finally { logs.restore(); }
  for (const secret of ['one-time-code-123', 'another-code-456', 'user:alice', 'RT-xyz', 'secret-detail']) {
    assert.ok(!logs.text().includes(secret), `logged: ${secret}`);
  }
});
