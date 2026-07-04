import { Router, Request, Response } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const SCOPES = [
  'user-library-read',
  'playlist-modify-private',
  'playlist-modify-public',
  'user-read-email',
  'user-read-private',
].join(' ');

// Extend session type
declare module 'express-session' {
  interface SessionData {
    accessToken?: string;
    refreshToken?: string;
    spotifyState?: string;
    userId?: string;
  }
}

router.get('/login', (req: Request, res: Response) => {
  const state = uuidv4();
  req.session.spotifyState = state;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope: SCOPES,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    state,
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (error) {
    return res.redirect(`${frontendUrl}?error=spotify_auth_denied`);
  }

  if (state !== req.session.spotifyState) {
    return res.redirect(`${frontendUrl}?error=state_mismatch`);
  }

  try {
    const tokenRes = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    req.session.accessToken = tokenRes.data.access_token;
    req.session.refreshToken = tokenRes.data.refresh_token;

    return res.redirect(`${frontendUrl}/callback?success=true`);
  } catch (err) {
    console.error('Token exchange error:', err);
    return res.redirect(`${frontendUrl}?error=token_exchange_failed`);
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.session.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    const tokenRes = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    req.session.accessToken = tokenRes.data.access_token;
    if (tokenRes.data.refresh_token) {
      req.session.refreshToken = tokenRes.data.refresh_token;
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(401).json({ error: 'Token refresh failed' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get('/status', (req: Request, res: Response) => {
  res.json({ authenticated: !!req.session.accessToken });
});

export default router;
