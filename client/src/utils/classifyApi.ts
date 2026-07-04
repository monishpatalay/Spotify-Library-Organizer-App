import { Track } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

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
