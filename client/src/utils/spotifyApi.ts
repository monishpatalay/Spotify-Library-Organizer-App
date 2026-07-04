import { Track, SpotifyUser, AudioFeatures } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

function getAccessToken(): string | null {
  return localStorage.getItem('spotify_access_token');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('spotify_refresh_token');
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
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

async function apiFetch(
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

  // Auto-retry on 429 — respect Retry-After header, default 10s
  if (res.status === 429 && retries > 0) {
    const wait = parseInt(res.headers.get('Retry-After') ?? '10', 10) * 1000;
    await new Promise((r) => setTimeout(r, wait));
    return apiFetch(path, options, retries - 1);
  }

  // Refresh expired token then retry once
  if (res.status === 401) {
    token = await refreshAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
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

// Fetch audio features for up to N tracks in batches of 100.
// Returns a map of trackId → AudioFeatures. Gracefully skips failed batches.
export async function fetchAudioFeatures(
  trackIds: string[]
): Promise<Record<string, AudioFeatures>> {
  const result: Record<string, AudioFeatures> = {};
  for (let i = 0; i < trackIds.length; i += 100) {
    const batch = trackIds.slice(i, i + 100).join(',');
    try {
      const res = await apiFetch(`/api/spotify/audio-features?ids=${batch}`, {}, 0);
      if (!res.ok) continue;
      const data = await res.json();
      for (const af of (data.audio_features ?? [])) {
        if (af?.id) result[af.id] = af as AudioFeatures;
      }
    } catch { /* skip failed batch silently */ }
  }
  return result;
}

export async function createPlaylist(
  name: string,
  trackUris: string[]
): Promise<{ playlistId?: string; playlistUrl?: string; quota_blocked?: boolean; trackUris?: string[] }> {
  const token = getAccessToken();
  const res = await apiFetch('/api/spotify/playlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, trackUris, accessToken: token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to create playlist');
  }
  return res.json();
}
