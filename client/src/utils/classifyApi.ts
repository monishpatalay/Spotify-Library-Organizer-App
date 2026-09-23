import { Track } from '../types';
import { apiFetch } from './spotifyApi';

// Same-origin: Vercel serves the API at /api/* in production, and Vite proxies
// /api to the local Express server in dev (see vite.config.ts).
const API_BASE = '';
const CHUNK = 40;

// Calls the server which fetches lyrics from lyrics.ovh and runs franc ML
// Returns trackId → detected language (null if lyrics unavailable or undetermined)
export async function classifyTrackLanguages(
  tracks: Track[]
): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {};
  // Lyrics lookups are slow, so send small chunks (server limit is 50).
  // A failed chunk just leaves its tracks without a detected language.
  for (let i = 0; i < tracks.length; i += CHUNK) {
    try {
      const res = await apiFetch(`${API_BASE}/api/classify/language`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracks: tracks.slice(i, i + CHUNK).map((t) => ({
            id: t.id,
            artist: t.artists[0] ?? '',
            title: t.name,
          })),
        }),
      });
      if (res.ok) Object.assign(results, (await res.json()).results ?? {});
    } catch { /* skip failed chunk */ }
  }
  return results;
}
