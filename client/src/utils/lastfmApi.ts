import { Track } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

// Mood → Last.fm community tag keywords
export const MOOD_TAGS: Record<string, string[]> = {
  sad:       ['sad', 'melancholy', 'heartbreak', 'emotional', 'depressing', 'cry', 'sorrow',
              'grief', 'bittersweet', 'hurt', 'pain', 'longing', 'melancholic', 'breakup',
              'tears', 'unhappy', 'mournful', 'somber', 'dard', 'dukh', 'judaai', 'yaad',
              'bewafa', 'intezaar', 'separation', 'missing', 'nostalgia', 'taras'],
  happy:     ['happy', 'happiness', 'feel good', 'feel-good', 'upbeat', 'joyful', 'cheerful',
              'positive', 'fun', 'bright', 'euphoric', 'uplifting', 'sunshine', 'carefree',
              'good vibes', 'smile', 'khushi', 'festive', 'celebration', 'peppy', 'masti',
              'dhoom', 'naach', 'wedding', 'shaadi', 'sangeet'],
  party:     ['party', 'dance', 'club', 'banger', 'rave', 'edm', 'electro', 'dance music',
              'clubbing', 'dancehall', 'disco', 'groove', 'dancefloor', 'item', 'item song',
              'item number', 'dj', 'dhol', 'bhangra', 'tapori', 'remix', 'nightlife',
              'floor filler', 'dance number'],
  chill:     ['chill', 'chillout', 'relax', 'relaxing', 'mellow', 'calm', 'ambient', 'lofi',
              'lo-fi', 'laid back', 'peaceful', 'soothing', 'easy listening', 'sleep',
              'study', 'downtempo', 'acoustic', 'soft', 'slow', 'sufi', 'classical',
              'carnatic', 'hindustani', 'folk', 'evening', 'night'],
  energetic: ['energetic', 'energy', 'hype', 'intense', 'powerful', 'adrenaline', 'driving',
              'aggressive', 'anthemic', 'epic', 'rush', 'action', 'fast', 'beats', 'bass',
              'pump up', 'beast', 'fire', 'hard'],
  workout:   ['workout', 'gym', 'running', 'exercise', 'fitness', 'sport', 'motivation',
              'pump up', 'training', 'beast mode', 'cardio', 'hustle', 'grind', 'power'],
  romantic:  ['romantic', 'romance', 'love', 'love songs', 'crush', 'sensual', 'slow',
              'tender', 'intimate', 'passionate', 'devotion', 'sweet', 'pyaar', 'ishq',
              'mohabbat', 'dil', 'love song', 'duet', 'couples', 'valentine', 'affection'],
};

export function tagsMatchMood(tags: string[], mood: string): boolean {
  const targetKeywords = MOOD_TAGS[mood] ?? [];
  return tags.some((tag) =>
    targetKeywords.some((kw) => tag.includes(kw) || kw.includes(tag))
  );
}

export async function fetchLastFmTags(
  tracks: Track[]
): Promise<Record<string, string[]>> {
  if (tracks.length === 0) return {};
  try {
    const res = await fetch(`${API_BASE}/api/lastfm/tags/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tracks: tracks.map((t) => ({
          id: t.id,
          artist: t.artists[0] ?? '',
          track: t.name,
        })),
      }),
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.tags ?? {};
  } catch {
    return {};
  }
}
