import { Router, Request, Response } from 'express';
import axios from 'axios';
import { randomBytes } from 'crypto';
import { asyncRoute } from '../utils/asyncRoute.js';
import { readCookie, cookieOptions } from '../utils/cookies.js';
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from '../utils/session.js';
import { createSpotifyClient } from '../utils/spotifyClient.js';

const router = Router();

const REFRESH_COOKIE = 'sp_refresh';
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days, then log in again
const STATE_COOKIE = 'sp_oauth_state';
const STATE_MAX_AGE = 10 * 60 * 1000; // time allowed on Spotify's consent screen

// Signed proof that this Spotify user logged in through this app (see utils/session.ts).
async function issueSession(res: Response, accessToken: string) {
  const { data } = await createSpotifyClient(accessToken).get('/me');
  res.cookie(SESSION_COOKIE, signSession(data.id), cookieOptions('/api', SESSION_MAX_AGE));
}

// Only what the app uses: read liked songs, create private playlists, show the
// user's email on the dashboard (/me's id, name and avatar need no scope).
const SCOPES = [
  'user-library-read',
  'playlist-modify-private',
  'user-read-email',
].join(' ');

function cfg() {
  return {
    clientId: process.env.SPOTIFY_CLIENT_ID!,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI ?? 'http://127.0.0.1:3001/api/auth/callback',
    frontendUrl: process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173',
  };
}

// GET /api/auth/login
router.get('/login', (_req: Request, res: Response) => {
  const { clientId, redirectUri } = cfg();
  console.log('Login — clientId:', clientId, '| redirectUri:', redirectUri);

  // One-time state, checked on the callback so nobody can complete a login the
  // user's own browser didn't start (login CSRF).
  const state = randomBytes(32).toString('hex');
  res.cookie(STATE_COOKIE, state, cookieOptions('/api/auth', STATE_MAX_AGE));

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    show_dialog: 'true',
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

// GET /api/auth/callback
router.get('/callback', asyncRoute(async (req: Request, res: Response) => {
  const { clientId, clientSecret, redirectUri, frontendUrl } = cfg();
  const code = req.query.code as string | undefined;
  const error = req.query.error as string | undefined;

  // Never log the query: the one-time code can be exchanged for tokens.
  console.log('Callback — error:', error, '| code:', code ? 'present' : 'missing');

  const expectedState = readCookie(req, STATE_COOKIE);
  res.clearCookie(STATE_COOKIE, cookieOptions('/api/auth'));

  if (error || !code) {
    res.redirect(`${frontendUrl}/?error=${encodeURIComponent(error ?? 'no_code')}`);
    return;
  }
  if (!expectedState || req.query.state !== expectedState) {
    res.redirect(`${frontendUrl}/?error=state_mismatch`);
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
    // The long-lived refresh token stays in an HttpOnly cookie. The short-lived
    // access token goes in the URL fragment, which browsers never send to a server.
    await issueSession(res, access_token);
    if (refresh_token) res.cookie(REFRESH_COOKIE, refresh_token, cookieOptions('/api/auth', REFRESH_MAX_AGE));
    const params = new URLSearchParams({ access_token, expires_in: String(expires_in) });
    res.redirect(`${frontendUrl}/callback#${params.toString()}`);
  } catch (err: any) {
    const spotifyError = err?.response?.data;
    console.error('Token exchange — FAILED:', spotifyError?.error ?? err.message);
    res.redirect(`${frontendUrl}/?error=login_failed`);
  }
}));

// POST /api/auth/refresh — uses the HttpOnly refresh cookie set at login.
router.post('/refresh', asyncRoute(async (req: Request, res: Response) => {
  const { clientId, clientSecret } = cfg();
  const refresh_token = readCookie(req, REFRESH_COOKIE);
  if (!refresh_token) {
    res.status(401).json({ error: 'Not logged in' });
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

    const { access_token, expires_in, refresh_token: rotated } = tokenRes.data;
    await issueSession(res, access_token);
    if (rotated) res.cookie(REFRESH_COOKIE, rotated, cookieOptions('/api/auth', REFRESH_MAX_AGE));
    res.json({ access_token, expires_in });
  } catch (err: any) {
    console.error('Refresh error:', err?.response?.data?.error ?? err.message);
    res.status(401).json({ error: 'Failed to refresh token' });
  }
}));

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE, cookieOptions('/api/auth'));
  res.clearCookie(SESSION_COOKIE, cookieOptions('/api'));
  res.status(204).end();
});

export default router;
