import { Track, ParsedPrompt } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export async function aiParsePrompt(prompt: string): Promise<ParsedPrompt | null> {
  try {
    const res = await fetch(`${API_BASE}/api/ai/parse-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface AIClassification {
  moods: string[];
  language: string | null;
}

// Classifies tracks in chunks of 100, reporting progress as each chunk completes.
// The server caches results by track ID — subsequent calls for the same songs are instant.
export async function aiClassify(
  tracks: Track[],
  onProgress?: (done: number, total: number, fromCache: number) => void
): Promise<Record<string, AIClassification>> {
  if (tracks.length === 0) return {};

  const CHUNK = 100;
  const all: Record<string, AIClassification> = {};
  let totalCached = 0;

  for (let i = 0; i < tracks.length; i += CHUNK) {
    const chunk = tracks.slice(i, i + CHUNK);
    try {
      const payload = chunk.map((t) => ({
        id: t.id,
        name: t.name,
        artist: t.artists[0] ?? '',
        album: t.album,
        valence: t.audioFeatures?.valence,
        energy: t.audioFeatures?.energy,
        danceability: t.audioFeatures?.danceability,
        tempo: t.audioFeatures?.tempo,
        tags: t.lastfmTags?.slice(0, 8),
      }));

      const res = await fetch(`${API_BASE}/api/ai/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks: payload }),
      });

      if (res.ok) {
        const data = await res.json();
        Object.assign(all, data.results ?? {});
        totalCached += data.cached ?? 0;
      }
    } catch { /* skip chunk on network error */ }

    onProgress?.(Math.min(i + CHUNK, tracks.length), tracks.length, totalCached);
  }

  return all;
}
