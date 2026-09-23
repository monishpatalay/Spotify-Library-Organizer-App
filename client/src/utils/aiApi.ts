import { Track, ParsedPrompt } from '../types';
import { apiFetch } from './spotifyApi';

// Same-origin: Vercel serves the API at /api/* in production, and Vite proxies
// /api to the local Express server in dev (see vite.config.ts).
const API_BASE = '';

export async function aiParsePrompt(prompt: string): Promise<ParsedPrompt | null> {
  try {
    const res = await apiFetch(`${API_BASE}/api/ai/parse-prompt`, {
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

export interface AIClassifyResult {
  results: Record<string, AIClassification>;
  cached: number;
  classified: number;
  failed: number;
}

// Classifies tracks in chunks of 100, reporting progress as each chunk completes.
// The server caches results by track ID — subsequent calls for the same songs are instant.
export async function aiClassify(
  tracks: Track[],
  onProgress?: (done: number, total: number, fromCache: number) => void
): Promise<AIClassifyResult> {
  if (tracks.length === 0) {
    return { results: {}, cached: 0, classified: 0, failed: 0 };
  }

  const CHUNK = 100;
  const all: Record<string, AIClassification> = {};
  let totalCached = 0;
  let totalClassified = 0;
  let totalFailed = 0;

  for (let i = 0; i < tracks.length; i += CHUNK) {
    const chunk = tracks.slice(i, i + CHUNK);
    try {
      // Trimmed to the server's limits so one long title can't get the whole chunk rejected.
      const payload = chunk.map((t) => ({
        id: t.id,
        name: t.name.slice(0, 300),
        artist: (t.artists[0] ?? '').slice(0, 300),
        album: t.album.slice(0, 300),
        tags: t.lastfmTags?.filter((tag) => tag.length <= 50).slice(0, 8),
      }));

      const res = await apiFetch(`${API_BASE}/api/ai/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks: payload }),
      });

      if (res.ok || res.status === 207) {
        const data = await res.json();
        Object.assign(all, data.results ?? {});
        totalCached += data.cached ?? 0;
        totalClassified += data.classified ?? 0;
        totalFailed += data.failed ?? 0;
      } else {
        totalFailed += chunk.length;
      }
    } catch {
      totalFailed += chunk.length;
    }

    onProgress?.(Math.min(i + CHUNK, tracks.length), tracks.length, totalCached);
  }

  if (totalClassified === 0 && totalCached === 0 && tracks.length > 0) {
    throw new Error('AI tagging unavailable');
  }

  return {
    results: all,
    cached: totalCached,
    classified: totalClassified,
    failed: totalFailed,
  };
}
