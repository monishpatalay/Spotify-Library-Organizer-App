import { Request, Response, NextFunction } from 'express';
import { readCookie } from '../utils/cookies.js';
import { SESSION_COOKIE, verifySession } from '../utils/session.js';

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

// Requires the signed session cookie issued by this app's OAuth callback. A bare
// Spotify token is not enough: tokens issued to any other app would also pass /v1/me.
export function requireSpotifyUser(req: Request, res: Response, next: NextFunction) {
  const userId = verifySession(readCookie(req, SESSION_COOKIE));
  if (!userId) {
    res.status(401).json({ error: 'Not logged in' });
    return;
  }
  (req as any).spotifyUserId = userId;
  next();
}
