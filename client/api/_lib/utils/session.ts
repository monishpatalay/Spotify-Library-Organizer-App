import { createHmac, timingSafeEqual } from 'crypto';

// A session proves the user logged in through THIS app's OAuth callback (a Spotify
// token issued to any other app is not enough). Format: base64url(payload).signature.
export const SESSION_COOKIE = 'sp_session';
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // matches the refresh cookie

// ponytail: key derived from SPOTIFY_CLIENT_SECRET so no extra env var is needed;
// rotating that secret logs everyone out. Add a dedicated SESSION_SECRET if that bites.
function key(): Buffer {
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!secret) throw new Error('SPOTIFY_CLIENT_SECRET must be set');
  return createHmac('sha256', secret).update('sp_session v1').digest();
}

const sign = (payload: string) => createHmac('sha256', key()).update(payload).digest('base64url');

export function signSession(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ u: userId, exp: Date.now() + SESSION_MAX_AGE })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

// Returns the Spotify user ID, or null if the cookie is missing, forged or expired.
export function verifySession(value: string | undefined): string | null {
  const [payload, sig] = (value ?? '').split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof u === 'string' && u && typeof exp === 'number' && exp > Date.now() ? u : null;
  } catch { return null; }
}
