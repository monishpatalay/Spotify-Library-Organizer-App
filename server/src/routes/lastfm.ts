import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const LASTFM_BASE = 'http://ws.audioscrobbler.com/2.0/';
const BATCH = 10; // concurrent requests per wave

interface TrackInput { id: string; artist: string; track: string; }

async function getTagsForTrack(input: TrackInput, apiKey: string): Promise<string[]> {
  try {
    const { data } = await axios.get(LASTFM_BASE, {
      params: {
        method: 'track.getTopTags',
        artist: input.artist,
        track: input.track,
        api_key: apiKey,
        format: 'json',
        autocorrect: 1,
      },
      timeout: 5000,
    });
    return (data?.toptags?.tag ?? [])
      .filter((t: any) => Number(t.count) > 3)
      .map((t: any) => String(t.name).toLowerCase());
  } catch {
    return [];
  }
}

// POST /api/lastfm/tags/batch
// Body: { tracks: [{ id, artist, track }] }
// Returns: { tags: Record<trackId, string[]> }
router.post('/tags/batch', async (req: Request, res: Response) => {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'LASTFM_API_KEY not set in server environment' });
    return;
  }

  const tracks: TrackInput[] = req.body?.tracks ?? [];
  if (!Array.isArray(tracks) || tracks.length === 0) {
    res.status(400).json({ error: 'tracks array is required' });
    return;
  }

  const results: Record<string, string[]> = {};

  // Process in waves of BATCH parallel requests, small delay between waves
  for (let i = 0; i < tracks.length; i += BATCH) {
    const wave = tracks.slice(i, i + BATCH);
    await Promise.all(
      wave.map(async (t) => {
        results[t.id] = await getTagsForTrack(t, apiKey);
      })
    );
    // Respect Last.fm's ~5 req/sec limit between waves
    if (i + BATCH < tracks.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  res.json({ tags: results });
});

export default router;
