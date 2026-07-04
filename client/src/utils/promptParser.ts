import { ParsedPrompt } from '../types';

const MOOD_KEYWORDS: Record<string, string[]> = {
  sad:       ['sad', 'melancholy', 'heartbreak', 'depressing', 'gloomy', 'lonely', 'crying', 'tearful'],
  happy:     ['happy', 'joyful', 'cheerful', 'upbeat', 'feel good', 'feel-good', 'positive', 'bright'],
  party:     ['party', 'club', 'dance', 'hype', 'banger', 'rave'],
  chill:     ['chill', 'relax', 'calm', 'mellow', 'peaceful', 'soothing', 'lofi', 'lo-fi', 'sleep', 'study'],
  energetic: ['energetic', 'energy', 'pump up', 'hype', 'intense', 'power'],
  workout:   ['workout', 'gym', 'running', 'exercise', 'training', 'fitness'],
  romantic:  ['romantic', 'romance', 'love', 'date night', 'slow dance'],
};

const LANGUAGE_KEYWORDS = [
  'telugu', 'hindi', 'punjabi', 'tamil', 'kannada', 'malayalam',
  'bengali', 'marathi', 'gujarati', 'urdu', 'english',
  'korean', 'japanese', 'spanish', 'arabic', 'chinese',
];

const MOOD_PLAYLIST_NAMES: Record<string, string> = {
  sad:       'Sad Hours',
  happy:     'Good Vibes',
  party:     'Party Mix',
  chill:     'Chill Mode',
  energetic: 'Energy Boost',
  workout:   'Workout Fuel',
  romantic:  'Romantic Night',
};

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function detectMood(lower: string): string | null {
  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return mood;
  }
  return null;
}

function detectLanguage(lower: string): string | null {
  return LANGUAGE_KEYWORDS.find((lang) => lower.includes(lang)) ?? null;
}

export function parseUserPrompt(prompt: string): ParsedPrompt {
  const lower = prompt.toLowerCase().trim();

  // Pattern: "Create a playlist of all [artist] songs called [name]"
  const artistPlaylistMatch = lower.match(
    /create\s+(?:a\s+)?playlist\s+of\s+all\s+(.+?)\s+songs?\s+called\s+(.+)/i
  );
  if (artistPlaylistMatch) {
    const nameRaw = prompt.match(/called\s+(.+)/i)?.[1]?.trim() ?? artistPlaylistMatch[2];
    // Check if the artist token is actually a mood or language
    const mayMood = detectMood(artistPlaylistMatch[1]);
    const mayLang = detectLanguage(artistPlaylistMatch[1]);
    if (mayMood) return { action: 'create', playlistName: toTitleCase(nameRaw), filterType: 'mood', filterValue: mayMood };
    if (mayLang) return { action: 'create', playlistName: toTitleCase(nameRaw), filterType: 'language', filterValue: mayLang };
    return { action: 'create', playlistName: toTitleCase(nameRaw), filterType: 'artist', filterValue: artistPlaylistMatch[1].trim() };
  }

  // Pattern: "Put all [X] songs into/in a playlist called [name]"
  const genrePlaylistMatch = lower.match(
    /put\s+all\s+(.+?)\s+songs?\s+(?:into|in)\s+(?:a\s+)?playlist\s+called\s+(.+)/i
  );
  if (genrePlaylistMatch) {
    const nameRaw = prompt.match(/called\s+(.+)/i)?.[1]?.trim() ?? genrePlaylistMatch[2];
    const token = genrePlaylistMatch[1].trim();
    const mayMood = detectMood(token);
    const mayLang = detectLanguage(token);
    if (mayMood) return { action: 'create', playlistName: toTitleCase(nameRaw), filterType: 'mood', filterValue: mayMood };
    if (mayLang) return { action: 'create', playlistName: toTitleCase(nameRaw), filterType: 'language', filterValue: mayLang };
    return { action: 'create', playlistName: toTitleCase(nameRaw), filterType: 'language_or_genre', filterValue: toTitleCase(token) };
  }

  // Pattern: "Put songs before [year] into [name]"
  const beforeYearMatch = lower.match(
    /put\s+songs?\s+before\s+(\d{4})\s+(?:into|in)\s+(?:a\s+)?(?:playlist\s+(?:called\s+)?)?(.+)/i
  );
  if (beforeYearMatch) {
    const nameRaw = prompt.match(/(?:into|in)\s+(?:a\s+)?(?:playlist\s+(?:called\s+)?)?(.+)/i)?.[1]?.trim() ?? beforeYearMatch[2];
    return { action: 'create', playlistName: nameRaw, filterType: 'release_year_before', filterValue: parseInt(beforeYearMatch[1], 10) };
  }

  // Pattern: "Put songs after [year] into [name]"
  const afterYearMatch = lower.match(
    /put\s+songs?\s+after\s+(\d{4})\s+(?:into|in)\s+(?:a\s+)?(?:playlist\s+(?:called\s+)?)?(.+)/i
  );
  if (afterYearMatch) {
    const nameRaw = prompt.match(/(?:into|in)\s+(?:a\s+)?(?:playlist\s+(?:called\s+)?)?(.+)/i)?.[1]?.trim() ?? afterYearMatch[2];
    return { action: 'create', playlistName: nameRaw, filterType: 'release_year_after', filterValue: parseInt(afterYearMatch[1], 10) };
  }

  // Pattern: "Create playlists for artists with more than [n] liked songs"
  const artistFreqMatch = lower.match(
    /create\s+playlists?\s+for\s+artists?\s+with\s+(?:more\s+than\s+)?(\d+)\s+liked\s+songs?/i
  );
  if (artistFreqMatch) {
    return { action: 'create_multiple', playlistName: '', filterType: 'artist_frequency', filterValue: parseInt(artistFreqMatch[1], 10) };
  }

  // Flexible mood: "give me sad songs" / "find all party songs" / "chill songs"
  const mood = detectMood(lower);
  if (mood) {
    // Check for "called [name]" suffix
    const namedMatch = lower.match(/called\s+(.+)/i);
    const name = namedMatch ? toTitleCase(prompt.match(/called\s+(.+)/i)![1].trim()) : MOOD_PLAYLIST_NAMES[mood] ?? `${toTitleCase(mood)} Songs`;
    return { action: 'create', playlistName: name, filterType: 'mood', filterValue: mood };
  }

  // Flexible language: "find me all telugu songs" / "english songs" / "give me tamil songs"
  const lang = detectLanguage(lower);
  if (lang) {
    const namedMatch = prompt.match(/called\s+(.+)/i);
    const name = namedMatch ? toTitleCase(namedMatch[1].trim()) : `${toTitleCase(lang)} Songs`;
    return { action: 'create', playlistName: name, filterType: 'language', filterValue: lang };
  }

  // Fallback: treat as artist filter
  return { action: 'create', playlistName: 'My Playlist', filterType: 'artist', filterValue: prompt.trim() };
}
