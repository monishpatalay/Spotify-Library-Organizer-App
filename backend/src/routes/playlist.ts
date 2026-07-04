import { Router, Request, Response } from 'express';
import { requireAuth, spotifyRequest } from '../middleware/auth';
import { parseUserPrompt } from '../services/promptParser';
import { filterTracks, Track, PlaylistGroup } from '../services/filterTracks';

const router = Router();

router.post('/preview', requireAuth, async (req: Request, res: Response) => {
  const { prompt, tracks } = req.body as { prompt: string; tracks: Track[] };

  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
  if (!tracks || tracks.length === 0) {
    return res.status(400).json({ error: 'No tracks provided. Please scan your liked songs first.' });
  }

  try {
    const parsed = await parseUserPrompt(prompt);
    const groups = filterTracks(tracks, parsed);
    return res.json({ parsed, groups });
  } catch (err) {
    console.error('Preview error:', err);
    return res.status(500).json({ error: 'Failed to generate preview' });
  }
});

router.post('/create', requireAuth, async (req: Request, res: Response) => {
  const { group } = req.body as { group: PlaylistGroup };

  if (!group || !group.matchedTracks?.length) {
    return res.status(400).json({ error: 'No tracks to add' });
  }

  try {
    const profile = await spotifyRequest<{ id: string }>(
      req.session.accessToken!,
      '/me'
    );

    const playlist = await spotifyRequest<{ id: string; external_urls: { spotify: string } }>(
      req.session.accessToken!,
      `/users/${profile.id}/playlists`,
      'post',
      {
        name: group.playlistName,
        description: `Created by Spotify Library Organizer — ${group.filterType}: ${group.filterValue}`,
        public: false,
      }
    );

    const uris = group.matchedTracks.map((t) => t.uri);
    for (let i = 0; i < uris.length; i += 100) {
      await spotifyRequest(
        req.session.accessToken!,
        `/playlists/${playlist.id}/tracks`,
        'post',
        { uris: uris.slice(i, i + 100) }
      );
    }

    return res.json({
      playlistId: playlist.id,
      playlistUrl: playlist.external_urls.spotify,
      tracksAdded: uris.length,
    });
  } catch (err: any) {
    if (err?.response?.status === 401) {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Create playlist error:', err);
    return res.status(500).json({ error: 'Failed to create playlist' });
  }
});

export default router;
