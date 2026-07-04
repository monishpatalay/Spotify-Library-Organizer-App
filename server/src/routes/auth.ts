import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

const SCOPES = [
  'user-library-read',
  'playlist-modify-private',
  'playlist-modify-public',
  'user-read-email',
  'user-read-private',
].join(' ');

function cfg() {
  return {
    clientId: process.env.SPOTIFY_CLIENT_ID!,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI ?? 'http://127.0.0.1:3001/api/auth/callback',
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  };
}

// GET /api/auth/login
router.get('/login', (_req: Request, res: Response) => {
  const { clientId, redirectUri } = cfg();
  console.log('Login — clientId:', clientId, '| redirectUri:', redirectUri);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    show_dialog: 'true',
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

// GET /api/auth/callback
router.get('/callback', async (req: Request, res: Response) => {
  const { clientId, clientSecret, redirectUri, frontendUrl } = cfg();
  const code = req.query.code as string | undefined;
  const error = req.query.error as string | undefined;

  console.log('Callback — error:', error, '| code:', code ? 'present' : 'missing', '| query:', req.query);

  if (error || !code) {
    res.redirect(`${frontendUrl}/?error=${encodeURIComponent(error ?? 'no_code')}`);
    return;
  }

  console.log('Token exchange — posting to Spotify | redirectUri:', redirectUri);
  try {
    const tokenRes = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    console.log('Token exchange — SUCCESS | has_token:', !!access_token, '| has_refresh:', !!refresh_token);
    const params = new URLSearchParams({ access_token, refresh_token, expires_in: String(expires_in) });
    const dest = `${frontendUrl}/callback?${params.toString()}`;
    console.log('Redirecting client to:', dest.slice(0, 80) + '...');
    res.redirect(dest);
  } catch (err: any) {
    const spotifyError = err?.response?.data;
    console.error('Token exchange — FAILED:', JSON.stringify(spotifyError ?? err.message));
    const msg = encodeURIComponent(JSON.stringify(spotifyError ?? err.message));
    res.redirect(`${frontendUrl}/?error=${msg}`);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const { clientId, clientSecret } = cfg();
  const { refresh_token } = req.body;
  if (!refresh_token) {
    res.status(400).json({ error: 'refresh_token is required' });
    return;
  }

  try {
    const tokenRes = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, expires_in } = tokenRes.data;
    res.json({ access_token, expires_in });
  } catch (err: any) {
    console.error('Refresh error:', err?.response?.data ?? err.message);
    res.status(401).json({ error: 'Failed to refresh token' });
  }
});

export default router;
