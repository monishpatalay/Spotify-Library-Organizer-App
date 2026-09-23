import { Page, Route } from '@playwright/test';

// Fixture API: every /api call is answered here. `user` is derived from the Bearer token.
export interface Api { aiFailuresLeft: number; playlistBodies: any[] }
const LIBRARY: Record<string, string[]> = {
  alice: ['Alice Secret Song', 'Alice Party Anthem'],
  bob: ['Bob Only Track'],
};

export async function mockApi(page: Page, api: Api) {
  await page.route('**/api/**', async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const user = (req.headers()['authorization'] ?? '').replace('Bearer ', '');
    const json = (status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    const body = req.postDataJSON?.() ?? {};

    switch (url.pathname) {
      case '/api/spotify/me':
        return json(200, { id: user, display_name: user, email: `${user}@example.com`, images: [] });
      case '/api/spotify/liked-songs': {
        const names = LIBRARY[user] ?? [];
        return json(200, {
          total: names.length,
          items: names.map((name, i) => ({ track: { id: `${user}-${i}`, uri: `spotify:track:${user}${i}`, name, artists: [{ name: 'Artist' }], album: { name: 'Album', images: [], release_date: '2021-01-01' }, external_urls: { spotify: 'https://open.spotify.com' } } })),
        });
      }
      case '/api/lastfm/tags/batch':
        return json(200, { tags: Object.fromEntries(body.tracks.map((t: any) => [t.id, ['dance']])) });
      case '/api/classify/language':
        return json(200, { results: Object.fromEntries(body.tracks.map((t: any) => [t.id, null])) });
      case '/api/ai/classify':
        if (api.aiFailuresLeft > 0) {
          api.aiFailuresLeft--;
          return json(502, { error: 'AI classification failed for all tracks', results: {}, cached: 0, classified: 0, failed: body.tracks.length });
        }
        return json(200, { results: Object.fromEntries(body.tracks.map((t: any) => [t.id, { moods: ['party'], language: 'punjabi' }])), cached: 0, classified: body.tracks.length, failed: 0 });
      case '/api/ai/parse-prompt':
        return json(200, { action: 'create', playlistName: 'Party Mix', filterType: 'mood', filterValue: 'party', conditions: [] });
      case '/api/spotify/playlist':
        api.playlistBodies.push(body);
        return json(200, { playlistId: 'pl1', playlistUrl: 'https://open.spotify.com/playlist/pl1' });
      default:
        return json(404, { error: 'unmocked' });
    }
  });
}

export const login = (page: Page, user: string) =>
  page.goto(`/callback#access_token=${user}&expires_in=3600`);

