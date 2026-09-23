// Client-side logic tests (API helpers, pagination, chunking, parsing).
// fetch and localStorage are stubbed; no browser or network needed.
import test, { beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mockHttp, Handler, MockResponse } from './helpers/mockHttp';
import { Track } from '../client/src/types';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
};

let handler: Handler = () => undefined;
const http = mockHttp((c) => handler(c));
beforeEach(() => {
  handler = () => undefined;
  http.calls.length = 0;
  store.clear();
  store.set('spotify_access_token', 'AT');
  store.set('spotify_refresh_token', 'RT');
});

import * as spotifyApi from '../client/src/utils/spotifyApi';
import { aiClassify } from '../client/src/utils/aiApi';
import { fetchLastFmTags } from '../client/src/utils/lastfmApi';
import { classifyTrackLanguages } from '../client/src/utils/classifyApi';
import { parseUserPrompt } from '../client/src/utils/promptParser';
import { filterSongs } from '../client/src/utils/filterSongs';

const track = (i: number, extra: Partial<Track> = {}): Track => ({
  id: `id${i}`, uri: `spotify:track:id${i}`, name: `Song ${i}`, artists: ['Artist'], album: 'Album',
  albumImage: '', releaseDate: '2020-01-01', spotifyUrl: '', ...extra,
});
const likedPage = (offset: number, count: number, total: number, nullEvery = 0): MockResponse => ({
  status: 200,
  body: {
    total,
    items: Array.from({ length: count }, (_, i) => {
      const n = offset + i;
      if (nullEvery && n % nullEvery === 0) return { track: null };
      return { track: { id: `id${n}`, uri: `spotify:track:id${n}`, name: `Song ${n}`, artists: [{ name: 'A' }], album: { name: 'Al', images: [], release_date: '2020' }, external_urls: {} } };
    }),
  },
});
const likedSongsLibrary = (total: number, nullEvery = 0): Handler => (c) => {
  if (!c.url.startsWith('/api/spotify/liked-songs')) return undefined;
  const offset = Number(new URL(c.url, 'http://x').searchParams.get('offset'));
  return likedPage(offset, Math.max(0, Math.min(50, total - offset)), total, nullEvery);
};

// ─── apiFetch: rate limits and token refresh ──────────────────────────────────
test('apiFetch honours a short Retry-After on 429 and then succeeds', async () => {
  let n = 0;
  handler = () => (n++ === 0 ? { status: 429, body: {}, headers: { 'Retry-After': '1' } } : { status: 200, body: { ok: true } });
  const start = Date.now();
  const res = await spotifyApi.apiFetch('/api/spotify/me');
  assert.equal(res.status, 200);
  assert.ok(Date.now() - start >= 950, 'waited for Retry-After');
});

test('apiFetch refreshes an expired token once and retries with the new one', async () => {
  handler = (c) => c.url === '/api/auth/refresh' ? { status: 200, body: { access_token: 'AT2', expires_in: 3600 } }
    : c.auth === 'Bearer AT2' ? { status: 200, body: {} } : { status: 401, body: {} };
  const res = await spotifyApi.apiFetch('/api/spotify/me');
  assert.equal(res.status, 200);
  assert.equal(store.get('spotify_access_token'), 'AT2');
});

test('apiFetch returns the 401 when the refresh token is rejected', async () => {
  handler = (c) => (c.url === '/api/auth/refresh' ? { status: 401, body: {} } : { status: 401, body: {} });
  assert.equal((await spotifyApi.apiFetch('/api/spotify/me')).status, 401);
});

// ─── Liked-songs pagination ───────────────────────────────────────────────────
test('fetchAllLikedSongs: empty library returns no tracks', async () => {
  handler = likedSongsLibrary(0);
  assert.deepEqual(await spotifyApi.fetchAllLikedSongs(), []);
});

test('fetchAllLikedSongs: a single track', async () => {
  handler = likedSongsLibrary(1);
  const tracks = await spotifyApi.fetchAllLikedSongs();
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].uri, 'spotify:track:id0');
});

test('fetchAllLikedSongs: 10,050 tracks over 201 pages, nothing truncated, unavailable items skipped', async () => {
  handler = likedSongsLibrary(10_050, 1000); // every 1000th item is a removed/unavailable track
  const progress: Array<[number, number]> = [];
  const tracks = await spotifyApi.fetchAllLikedSongs((f, t) => progress.push([f, t]));
  assert.equal(http.calls.length, 201);
  assert.equal(tracks.length, 10_050 - 11);
  assert.equal(new Set(tracks.map((t) => t.id)).size, tracks.length, 'no duplicates');
  assert.deepEqual(progress.at(-1), [10_039, 10_050]);
});

test('fetchAllLikedSongs surfaces Spotify errors and network failures', async () => {
  handler = () => ({ status: 500, body: { error: 'boom' } });
  await assert.rejects(spotifyApi.fetchAllLikedSongs(), /Liked songs fetch failed \(500\)/);
  handler = () => new TypeError('fetch failed');
  await assert.rejects(spotifyApi.fetchAllLikedSongs(), /fetch failed/);
});

test('the client no longer calls the deprecated audio-features endpoint', () => {
  assert.equal((spotifyApi as any).fetchAudioFeatures, undefined);
});

// ─── Classification and tag chunking ──────────────────────────────────────────
test('aiClassify sends 250 tracks in chunks of 100 and sums partial (207) results', async () => {
  handler = (c) => {
    const ids = (c.body as any).tracks.map((t: any) => t.id);
    const results = Object.fromEntries(ids.map((id: string) => [id, { moods: ['sad'], language: 'hindi' }]));
    return ids.length === 50 ? { status: 207, body: { results, cached: 0, classified: 40, failed: 10 } } : { status: 200, body: { results, cached: 20, classified: 80, failed: 0 } };
  };
  const out = await aiClassify(Array.from({ length: 250 }, (_, i) => track(i)));
  assert.deepEqual(http.calls.map((c) => (c.body as any).tracks.length), [100, 100, 50]);
  assert.deepEqual([out.cached, out.classified, out.failed], [40, 200, 10]);
});

test('aiClassify throws when every chunk fails, so the UI can show the error and Retry', async () => {
  handler = () => ({ status: 502, body: { error: 'AI classification failed for all tracks' } });
  await assert.rejects(aiClassify([track(1)]), /AI tagging unavailable/);
});

test('Last.fm tags are fetched in authenticated chunks of 100; a failed chunk is skipped', async () => {
  let n = 0;
  handler = (c) => {
    if (n++ === 1) return { status: 500, body: {} };
    return { status: 200, body: { tags: Object.fromEntries((c.body as any).tracks.map((t: any) => [t.id, ['pop']])) } };
  };
  const tags = await fetchLastFmTags(Array.from({ length: 250 }, (_, i) => track(i)));
  assert.deepEqual(http.calls.map((c) => (c.body as any).tracks.length), [100, 100, 50]);
  assert.ok(http.calls.every((c) => c.auth === 'Bearer AT'));
  assert.equal(Object.keys(tags).length, 150);
});

test('language detection is requested in authenticated chunks of 40', async () => {
  handler = () => ({ status: 200, body: { results: {} } });
  await classifyTrackLanguages(Array.from({ length: 100 }, (_, i) => track(i)));
  assert.deepEqual(http.calls.map((c) => (c.body as any).tracks.length), [40, 40, 20]);
  assert.ok(http.calls.every((c) => c.auth === 'Bearer AT'));
});

test('createPlaylist surfaces the server error message', async () => {
  handler = () => ({ status: 500, body: { error: 'Failed to add tracks to playlist' } });
  await assert.rejects(spotifyApi.createPlaylist('x', ['spotify:track:1']), /Failed to add tracks to playlist/);
});

// ─── Prompt parsing and filtering with unusual input ──────────────────────────
test('the regex prompt parser survives emoji, RTL and 10k-character prompts', () => {
  for (const p of ['🔥 party songs 🎉', 'أغاني حزينة', 'x'.repeat(10_000), '', '‮evil‬']) {
    const parsed = parseUserPrompt(p);
    assert.equal(typeof parsed.playlistName, 'string');
  }
});

test('artist filtering matches non-Latin artist names', () => {
  const tracks = [track(1, { artists: ['عمرو دياب'] }), track(2, { artists: ['BTS (방탄소년단)'] }), track(3)];
  const out = filterSongs(tracks, { action: 'create', playlistName: 'x', filterType: 'artist', filterValue: 'عمرو دياب' });
  assert.deepEqual(out.map((t) => t.id), ['id1']);
});

test.after(() => { http.restore(); mock.reset(); });
