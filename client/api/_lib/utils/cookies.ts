import { Request, CookieOptions } from 'express';

export function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

// HttpOnly so page scripts can never read it; Lax so it still arrives on the
// top-level redirect back from Spotify. Secure whenever the site is served over https.
export function cookieOptions(path: string, maxAgeMs?: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: (process.env.FRONTEND_URL ?? '').startsWith('https://'),
    path,
    ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
  };
}
