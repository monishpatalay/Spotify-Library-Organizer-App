import { Track } from '../types';

// Same-origin: Vercel serves the API at /api/* in production, and Vite proxies
// /api to the local Express server in dev (see vite.config.ts).
const API_BASE = '';

// Calls the server which fetches lyrics from lyrics.ovh and runs franc ML
// Returns trackId → detected language (null if lyrics unavailable or undetermined)
export async function classifyTrackLanguages(
  tracks: Track[]
): Promise<Record<string, string | null>> {
  if (tracks.length === 0) return {};
  try {
    const res = await fetch(`${API_BASE}/api/classify/language`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tracks: tracks.map((t) => ({
          id: t.id,
          artist: t.artists[0] ?? '',
          title: t.name,
        })),
      }),
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.results ?? {};
  } catch {
    return {};
  }
}
