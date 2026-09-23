import { Request, Response, NextFunction } from 'express';

// Middleware that extracts the Bearer token from the Authorization header
// and attaches it to req for downstream route handlers.
export function extractToken(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  (req as any).accessToken = auth.slice(7);
  next();
}

export async function requireSpotifyUser(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const accessToken = auth.slice(7);
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      res.status(401).json({ error: 'Invalid Spotify access token' });
      return;
    }

    const user = await response.json() as { id?: string };
    if (!user.id) {
      res.status(401).json({ error: 'Invalid Spotify user' });
      return;
    }

    (req as any).accessToken = accessToken;
    (req as any).spotifyUserId = user.id;
    next();
  } catch {
    res.status(503).json({ error: 'Spotify authentication unavailable' });
  }
}
