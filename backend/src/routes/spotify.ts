import { Router, Request, Response } from 'express';
import { requireAuth, spotifyRequest } from '../middleware/auth';

const router = Router();

router.get('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const profile = await spotifyRequest<SpotifyProfile>(
      req.session.accessToken!,
      '/me'
    );
    return res.json(profile);
  } catch (err: any) {
    if (err?.response?.status === 401) {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.get('/liked-songs', requireAuth, async (req: Request, res: Response) => {
  const allTracks: SpotifyTrackItem[] = [];
  let url = '/me/tracks?limit=50';

  try {
    while (url) {
      const data = await spotifyRequest<SpotifyTracksPage>(
        req.session.accessToken!,
        url
      );
      allTracks.push(...data.items);

      if (data.next) {
        // Extract path from full URL
        const nextUrl = new URL(data.next);
        url = nextUrl.pathname.replace('/v1', '') + nextUrl.search;
      } else {
        url = '';
      }
    }

    const tracks: Track[] = allTracks.map((item) => ({
      id: item.track.id,
      uri: item.track.uri,
      name: item.track.name,
      artists: item.track.artists.map((a) => ({ id: a.id, name: a.name })),
      album: item.track.album.name,
      albumImage: item.track.album.images[0]?.url || '',
      releaseDate: item.track.album.release_date,
      spotifyUrl: item.track.external_urls.spotify,
    }));

    return res.json({ tracks, total: tracks.length });
  } catch (err: any) {
    if (err?.response?.status === 401) {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Failed to fetch liked songs' });
  }
});

// Types
interface SpotifyProfile {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string }>;
  followers: { total: number };
}

interface SpotifyTrackItem {
  added_at: string;
  track: {
    id: string;
    uri: string;
    name: string;
    artists: Array<{ id: string; name: string }>;
    album: {
      name: string;
      images: Array<{ url: string }>;
      release_date: string;
    };
    external_urls: { spotify: string };
  };
}

interface SpotifyTracksPage {
  items: SpotifyTrackItem[];
  next: string | null;
  total: number;
}

interface Track {
  id: string;
  uri: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: string;
  albumImage: string;
  releaseDate: string;
  spotifyUrl: string;
}

export default router;
