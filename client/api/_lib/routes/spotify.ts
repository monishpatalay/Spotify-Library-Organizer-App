import { Router, Request, Response } from 'express';
import { extractToken } from '../middleware/tokenRefresh';
import { createSpotifyClient } from '../utils/spotifyClient';

const router = Router();

// GET /api/spotify/me
router.get('/me', extractToken, async (req: Request, res: Response) => {
  const token = (req as any).accessToken as string;
  try {
    const client = createSpotifyClient(token);
    const { data } = await client.get('/me');
    res.json(data);
  } catch (err: any) {
    const status = err?.response?.status ?? 500;
    const retryAfter = err?.response?.headers?.['retry-after'];
    if (retryAfter) res.set('Retry-After', String(retryAfter));
    res.status(status).json({ error: err?.response?.data ?? err.message });
  }
});

// GET /api/spotify/audio-features?ids=id1,id2,...  (max 100 ids per call)
router.get('/audio-features', extractToken, async (req: Request, res: Response) => {
  const token = (req as any).accessToken as string;
  const ids = req.query.ids as string;
  if (!ids) { res.status(400).json({ error: 'ids parameter required' }); return; }
  try {
    const client = createSpotifyClient(token);
    const { data } = await client.get('/audio-features', { params: { ids } });
    res.json(data);
  } catch (err: any) {
    const status = err?.response?.status ?? 500;
    const retryAfter = err?.response?.headers?.['retry-after'];
    if (retryAfter) res.set('Retry-After', String(retryAfter));
    res.status(status).json({ error: err?.response?.data ?? err.message });
  }
});

// GET /api/spotify/liked-songs?limit=50&offset=0
router.get('/liked-songs', extractToken, async (req: Request, res: Response) => {
  const token = (req as any).accessToken as string;
  const limit = Math.min(50, parseInt((req.query.limit as string) ?? '50', 10));
  const offset = parseInt((req.query.offset as string) ?? '0', 10);

  try {
    const client = createSpotifyClient(token);
    const { data } = await client.get('/me/tracks', { params: { limit, offset } });
    res.json(data);
  } catch (err: any) {
    const status = err?.response?.status ?? 500;
    res.status(status).json({ error: err?.response?.data ?? err.message });
  }
});

// POST /api/spotify/playlist
router.post('/playlist', async (req: Request, res: Response) => {
  const { name, trackUris, accessToken } = req.body as {
    name: string;
    trackUris: string[];
    accessToken: string;
  };

  if (!name || !accessToken) {
    res.status(400).json({ error: 'name and accessToken are required' });
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
  const uris = (trackUris ?? []).filter(Boolean);
  if (uris.length === 0) {
    res.json({ playlistId, playlistUrl });
    return;
  }

  const batches: string[][] = [];
  for (let i = 0; i < uris.length; i += 100) {
    batches.push(uris.slice(i, i + 100));
  }

  for (const batch of batches) {
    try {
      await client.post(`/playlists/${playlistId}/tracks`, { uris: batch });
    } catch (err: any) {
      if (err?.response?.status === 403) {
        // Quota blocked — return partial success
        res.json({
          quota_blocked: true,
          playlistId,
          playlistUrl,
          trackUris: uris,
        });
        return;
      }
      res.status(500).json({ error: 'Failed to add tracks to playlist' });
      return;
    }
  }

  res.json({ playlistId, playlistUrl });
});

export default router;
