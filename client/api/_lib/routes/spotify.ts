import { Router, Request, Response } from 'express';
import { extractToken } from '../middleware/tokenRefresh.js';
import { createSpotifyClient } from '../utils/spotifyClient.js';
import { asyncRoute } from '../utils/asyncRoute.js';

const router = Router();

// Pass Spotify's status (and its Retry-After on 429) through to the client.
function sendSpotifyError(res: Response, err: any) {
  const status = err?.response?.status ?? 500;
  const retryAfter = err?.response?.headers?.['retry-after'];
  if (retryAfter) res.set('Retry-After', String(retryAfter));
  // Spotify's own error body is fine to pass on; a network error's message
  // (internal hosts, ports) is only logged.
  if (!err?.response) console.error('Spotify request failed:', err?.message);
  res.status(status).json({ error: err?.response ? err.response.data : 'Spotify is unreachable' });
}

// GET /api/spotify/me
router.get('/me', extractToken, asyncRoute(async (req: Request, res: Response) => {
  const token = (req as any).accessToken as string;
  try {
    const client = createSpotifyClient(token);
    const { data } = await client.get('/me');
    res.json(data);
  } catch (err: any) {
    sendSpotifyError(res, err);
  }
}));

// GET /api/spotify/liked-songs?limit=50&offset=0
router.get('/liked-songs', extractToken, asyncRoute(async (req: Request, res: Response) => {
  const token = (req as any).accessToken as string;
  const limit = Math.min(50, parseInt((req.query.limit as string) ?? '50', 10));
  const offset = parseInt((req.query.offset as string) ?? '0', 10);

  try {
    const client = createSpotifyClient(token);
    const { data } = await client.get('/me/tracks', { params: { limit, offset } });
    res.json(data);
  } catch (err: any) {
    sendSpotifyError(res, err);
  }
}));

const TRACK_URI = /^spotify:track:[A-Za-z0-9]{22}$/;

// POST /api/spotify/playlist
router.post('/playlist', extractToken, asyncRoute(async (req: Request, res: Response) => {
  const accessToken = (req as any).accessToken as string;
  const { name, trackUris } = req.body as { name?: unknown; trackUris?: unknown };

  // Validate everything before creating the playlist, so bad input never
  // leaves an empty playlist behind in the user's account.
  if (typeof name !== 'string' || !name.trim() || name.length > 100) {
    res.status(400).json({ error: 'name must be 1–100 characters' });
    return;
  }
  if (trackUris !== undefined && (!Array.isArray(trackUris)
    || !trackUris.every((u) => typeof u === 'string' && TRACK_URI.test(u)))) {
    res.status(400).json({ error: 'trackUris must be Spotify track URIs' });
    return;
  }

  const client = createSpotifyClient(accessToken);

  // Create the playlist via /me/playlists (current user implied — no separate /me lookup needed)
  let playlistId: string;
  let playlistUrl: string;
  try {
    const { data: playlist } = await client.post('/me/playlists', {
      name,
      public: false,
      description: `Created by Spotify Library Organizer`,
    });
    playlistId = playlist.id;
    playlistUrl = playlist.external_urls?.spotify ?? `https://open.spotify.com/playlist/${playlist.id}`;
  } catch (err: any) {
    const status = err?.response?.status ?? 500;
    const retryAfter = err?.response?.headers?.['retry-after'];
    if (retryAfter) res.set('Retry-After', String(retryAfter));
    res.status(status).json({ error: 'Failed to create playlist' });
    return;
  }

  // Step 3: Add tracks in batches of 100
  const uris = (trackUris as string[] | undefined) ?? [];
  if (uris.length === 0) {
    res.json({ playlistId, playlistUrl });
    return;
  }

  const batches: string[][] = [];
  for (let i = 0; i < uris.length; i += 100) {
    batches.push(uris.slice(i, i + 100));
  }

  // The playlist already exists at this point, so every failure below still
  // reports it, with how far we got and the tracks that are still missing.
  let added = 0;
  for (const batch of batches) {
    try {
      await client.post(`/playlists/${playlistId}/tracks`, { uris: batch });
      added += batch.length;
    } catch (err: any) {
      const progress = { playlistId, playlistUrl, added, total: uris.length, trackUris: uris.slice(added) };
      if (err?.response?.status === 403) {
        res.json({ quota_blocked: true, ...progress });
        return;
      }
      res.status(502).json({ error: 'Failed to add all tracks to the playlist', ...progress });
      return;
    }
  }

  res.json({ playlistId, playlistUrl });
}));

export default router;
