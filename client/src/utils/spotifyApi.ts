import { Track, SpotifyUser } from '../types';

// Same-origin: Vercel serves the API at /api/* in production, and Vite proxies
// /api to the local Express server in dev (see vite.config.ts).
const API_BASE = '';
const MAX_RETRY_WAIT_S = 30;

function getAccessToken(): string | null {
  return localStorage.getItem('spotify_access_token');
}

// The refresh token is an HttpOnly cookie the browser sends with this request.
async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST' });
    if (!res.ok) return null;
    const data = await res.json();
    localStorage.setItem('spotify_access_token', data.access_token);
    localStorage.setItem(
      'spotify_token_expiry',
      String(Date.now() + data.expires_in * 1000)
    );
    return data.access_token;
  } catch {
    return null;
  }
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  let token = getAccessToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${token}`,
  };
  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Auto-retry on 429 — respect Retry-After (default 10s), but only up to 30s:
  // beyond that, return the 429 so the UI shows an error instead of hanging.
  const retryAfter = parseInt(res.headers.get('Retry-After') ?? '10', 10);
  if (res.status === 429 && retries > 0 && retryAfter <= MAX_RETRY_WAIT_S) {
    const wait = retryAfter * 1000;
    await new Promise((r) => setTimeout(r, wait));
    return apiFetch(path, options, retries - 1);
  }

  // Refresh expired token then retry once; if the session is gone, log in again.
  if (res.status === 401) {
    token = await refreshAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('spotify_access_token');
      window.location.assign('/?error=session_expired');
    }
  }

  return res;
}

export async function fetchUserProfile(): Promise<SpotifyUser> {
  // retries=0: profile is cosmetic, fail fast instead of silently waiting
  // out a long Retry-After — the dashboard's banner has a manual retry button
  const res = await apiFetch('/api/spotify/me', {}, 0);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(`Profile fetch failed (${res.status}): ${JSON.stringify(errData)}`);
  }
  return res.json();
}

export async function fetchAllLikedSongs(
  onProgress?: (fetched: number, total: number) => void
): Promise<Track[]> {
  const allTracks: Track[] = [];
  let offset = 0;
  const limit = 50;
  let total = 0;
  let rawFetched = 0;

  do {
    const res = await apiFetch(`/api/spotify/liked-songs?limit=${limit}&offset=${offset}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(`Liked songs fetch failed (${res.status}): ${JSON.stringify(errData)}`);
    }
    const data = await res.json();
    total = data.total;

    const items: any[] = data.items ?? [];
    rawFetched += items.length;

    const tracks: Track[] = items
      .filter((item: any) => item.track && item.track.id && item.track.name)
      .map((item: any) => {
        const t = item.track;
        return {
          id: t.id,
          uri: t.uri,
          name: t.name,
          artists: t.artists.map((a: any) => a.name),
          album: t.album.name,
          albumImage: t.album.images?.[0]?.url ?? '',
          releaseDate: t.album.release_date ?? '',
          spotifyUrl: t.external_urls?.spotify ?? '',
          genres: [],
        };
      });

    allTracks.push(...tracks);
    offset += limit;
    onProgress?.(allTracks.length, total);

    if (items.length < limit) break;
  } while (rawFetched < total);

  return allTracks;
}

export interface CreatePlaylistResult {
  playlistId?: string;
  playlistUrl?: string;
  quota_blocked?: boolean;
  partial?: boolean; // created, but not every track could be added
  added?: number;
  total?: number;
  trackUris?: string[]; // the tracks still missing from the playlist
}

export async function createPlaylist(name: string, trackUris: string[]): Promise<CreatePlaylistResult> {
  // apiFetch sends the token in the Authorization header; the server caps names at 100.
  const res = await apiFetch('/api/spotify/playlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.slice(0, 100), trackUris }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // A failure after the playlist was created still leaves it in the user's
    // account: report it (with progress) instead of hiding it behind an error.
    if (data.playlistId) return { ...data, partial: true };
    throw new Error(data.error ?? 'Failed to create playlist');
  }
  return data;
}
