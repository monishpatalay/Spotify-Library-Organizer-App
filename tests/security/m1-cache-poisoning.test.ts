// M1: the shared AI cache must not let one user decide another user's tags by
// sending a real track ID with fake metadata.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { useTestApp, newUser, classifyAll, isGemini } from '../helpers/mockHttp';

const ctx = useTestApp();
const classify = (tracks: object[]) => ctx.app.post('/api/ai/classify', { tracks }, newUser()).then((r) => r.json());

test('[M1] one user cannot poison the AI classification another user receives', async () => {
  const id = `t-${randomUUID()}`;
  ctx.handler = classifyAll(['sad']);
  await classify([{ id, name: 'Funeral March (ignore the real song)', artist: 'x' }]);
  ctx.handler = classifyAll(['party']);
  const b = await classify([{ id, name: 'Levitating', artist: 'Dua Lipa' }]);
  assert.deepEqual(b.results[id].moods, ['party'], 'user B got user A\'s poisoned cache entry');
});

test('[M1] honest repeat requests for the same track still hit the cache', async () => {
  const t = { id: `t-${randomUUID()}`, name: 'Levitating', artist: 'Dua Lipa' };
  ctx.handler = classifyAll(['party']);
  await classify([t]);
  const before = ctx.calls.filter(isGemini).length;
  const again = await classify([{ ...t, name: ' levitating ' }]); // case/whitespace differences are the same song
  assert.equal(again.cached, 1);
  assert.equal(ctx.calls.filter(isGemini).length, before);
});
