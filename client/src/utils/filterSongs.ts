import { Track, ParsedPrompt, PlaylistPreview, AudioFeatures, FilterCondition } from '../types';
import { UNIQUE_ARTISTS, KNOWN_FILMS, ALBUM_LANGUAGE_MARKERS } from './languageData';
import { tagsMatchMood } from './lastfmApi';

// ─── Unicode script ranges ────────────────────────────────────────────────────

const SCRIPT_LANG: [RegExp, string][] = [
  [/[ఀ-౿]/, 'telugu'],
  [/[஀-௿]/, 'tamil'],
  [/[ಀ-೿]/, 'kannada'],
  [/[ഀ-ൿ]/, 'malayalam'],
  [/[ऀ-ॿ]/, 'hindi'],
  [/[਀-੿]/, 'punjabi'],
  [/[ঀ-৿]/, 'bengali'],
  [/[઀-૿]/, 'gujarati'],
  [/[؀-ۿ]/, 'arabic'],
  [/[가-힯]/, 'korean'],
  [/[぀-ヿ]/, 'japanese'],
  [/[一-鿿]/, 'chinese'],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function norm(s: string) { return s.toLowerCase().trim(); }

function artistMatch(trackArtists: string[], target: string): boolean {
  const n = norm(target);
  return trackArtists.some((a) => {
    const na = norm(a);
    return na === n || na.includes(n) || n.includes(na);
  });
}

// ─── Last.fm language tag mapping ────────────────────────────────────────────
// Community listeners tag songs with the actual language they hear.
// These take priority over all heuristic checks.

const LANG_FM_TAGS: Record<string, string[]> = {
  punjabi:   ['punjabi', 'bhangra', 'punjabi pop', 'punjabi music', 'punjabi rap'],
  hindi:     ['hindi', 'bollywood', 'filmi', 'hindi film', 'hindi music', 'indian pop', 'desi pop'],
  telugu:    ['telugu', 'tollywood', 'telugu film', 'telugu music'],
  tamil:     ['tamil', 'kollywood', 'tamil film', 'tamil music'],
  kannada:   ['kannada', 'sandalwood', 'kannada film'],
  malayalam: ['malayalam', 'mollywood', 'kerala music'],
  bengali:   ['bengali', 'bangla', 'bengali music'],
  urdu:      ['urdu', 'ghazal', 'qawwali', 'sufi'],
  haryanvi:  ['haryanvi', 'haryana'],
  bhojpuri:  ['bhojpuri'],
  marathi:   ['marathi', 'marathi music'],
  gujarati:  ['gujarati'],
  rajasthani:['rajasthani', 'folk rajasthani'],
  korean:    ['k-pop', 'kpop', 'korean', 'korean pop'],
  japanese:  ['j-pop', 'jpop', 'japanese', 'anime'],
  arabic:    ['arabic', 'arabic music', 'khaleeji', 'arabic pop'],
  chinese:   ['chinese', 'mandarin pop', 'c-pop', 'cpop', 'mandarin'],
};

// Tags that confirm a track is NOT English (all Indian/regional + other languages)
const NON_ENGLISH_FM_TAGS = [
  ...Object.values(LANG_FM_TAGS).flat(),
  // Catch-all Indian terms without a specific language bucket
  'desi', 'desi rap', 'desi hip hop', 'indian hip hop', 'indian music',
  'indian classical', 'carnatic', 'hindustani', 'devotional',
];

// Tags that POSITIVELY confirm a track is English (not just "not Indian")
// Using specific English-language genre terms that aren't used for Indian music
const ENGLISH_POSITIVE_FM_TAGS = [
  'english pop', 'english rock', 'british', 'american', 'western',
  'indie rock', 'alternative rock', 'classic rock', 'pop punk', 'punk rock',
  'heavy metal', 'country music', 'bluegrass', 'country', 'soul music',
  'gospel', 'blues', 'jazz', 'rnb', 'r&b', 'trap', 'drill',
  'uk drill', 'grime', 'uk rap', 'afrobeats', 'reggaeton', 'latin pop',
];

function tier0_lastfmLang(track: Track, lang: string): boolean {
  if (!track.lastfmTags?.length) return false;
  const targets = LANG_FM_TAGS[lang] ?? [];
  return track.lastfmTags.some((tag) => targets.some((t) => tag === t || tag.includes(t)));
}

// ─── 4-tier language detection ────────────────────────────────────────────────

function tier1_script(track: Track, lang: string): boolean {
  const text = `${track.name} ${track.album}`;
  const entry = SCRIPT_LANG.find(([, l]) => l === lang);
  return entry ? entry[0].test(text) : false;
}

function tier2_albumLabel(track: Track, lang: string): boolean {
  const albumLow = norm(track.album);
  const markers = ALBUM_LANGUAGE_MARKERS[lang] ?? [];
  return markers.some((m) => albumLow.includes(m));
}

function tier3_filmName(track: Track, lang: string): boolean {
  const albumLow = norm(track.album);
  const films = KNOWN_FILMS[lang] ?? [];
  return films.some((film) => albumLow.includes(norm(film)));
}

function tier4_uniqueArtist(track: Track, lang: string): boolean {
  const uniqueArtists = UNIQUE_ARTISTS[lang] ?? [];
  return uniqueArtists.some((a) => artistMatch(track.artists, a));
}

function trackMatchesLanguage(track: Track, lang: string): boolean {
  // AI language classification is the highest-confidence signal.
  // Claude identifies language from artist name, song name, and album — not romanized lyrics.
  // This fixes false positives like "Jhol" (Hindi) appearing in English results.
  if (track.aiLanguage != null) return track.aiLanguage === lang;

  if (lang === 'english') return isEnglishTrack(track);

  // Tier 0: Last.fm community tags
  if (tier0_lastfmLang(track, lang)) return true;
  // Tier ML: franc from lyrics (unreliable for romanized text — AI is preferred)
  if (track.detectedLanguage != null) return track.detectedLanguage === lang;
  // Tiers 1-4: heuristics
  return (
    tier1_script(track, lang) ||
    tier2_albumLabel(track, lang) ||
    tier3_filmName(track, lang) ||
    tier4_uniqueArtist(track, lang)
  );
}

function isEnglishTrack(track: Track): boolean {
  // aiLanguage already handled above in trackMatchesLanguage
  if (track.lastfmTags?.length) {
    const hasNonEnglishTag = track.lastfmTags.some((tag) =>
      NON_ENGLISH_FM_TAGS.some((t) => tag === t || tag.includes(t))
    );
    if (hasNonEnglishTag) return false;

    const hasEnglishTag = track.lastfmTags.some((tag) =>
      ENGLISH_POSITIVE_FM_TAGS.some((t) => tag === t || tag.includes(t))
    );
    if (hasEnglishTag) return true;

    if (track.detectedLanguage != null) return track.detectedLanguage === 'english';
    return false;
  }

  if (track.detectedLanguage != null) return track.detectedLanguage === 'english';

  const text = `${track.name} ${track.album}`;
  if (SCRIPT_LANG.some(([re]) => re.test(text))) return false;
  const nonEnglishLangs = Object.keys(ALBUM_LANGUAGE_MARKERS).filter((l) => l !== 'english');
  if (nonEnglishLangs.some((lang) =>
    tier2_albumLabel(track, lang) ||
    tier3_filmName(track, lang) ||
    tier4_uniqueArtist(track, lang)
  )) return false;
  return tier4_uniqueArtist(track, 'english');
}

// ─── Mood from Spotify audio features ────────────────────────────────────────

// Love-related keywords for romantic pre-check (mirrors server CLASSIFY_SYSTEM)
const ROMANTIC_KEYWORDS = [
  'love', 'lover', 'heart', 'miss you', 'kiss', 'baby', 'darling', 'crush', 'romance',
  'romantic', 'forever', 'together', 'hold me', 'need you', 'without you', 'stay',
  'ishq', 'pyaar', 'mohabbat', 'dil', 'tera', 'tere', 'tujhe', 'saathiya', 'yaad',
  'prema', 'priya', 'nuvvu', 'mahi',
];

function matchesMood(af: AudioFeatures, mood: string, trackName?: string, tags?: string[]): boolean {
  if (mood === 'romantic') {
    // Semantic pre-check: love keywords in name or tags
    const haystack = [trackName ?? '', ...(tags ?? [])].join(' ').toLowerCase();
    if (ROMANTIC_KEYWORDS.some((kw) => haystack.includes(kw))) return true;
    // Audio features fallback
    return af.valence > 0.38 && af.energy < 0.65 && af.danceability < 0.7;
  }
  switch (mood) {
    case 'sad':       return af.valence < 0.4;
    case 'happy':     return af.valence > 0.62 && af.energy > 0.55;
    case 'party':     return af.danceability > 0.68 && af.energy > 0.65;
    case 'chill':     return af.energy < 0.45 && af.danceability < 0.65;
    case 'energetic': return af.energy > 0.75;
    case 'workout':   return af.energy > 0.75 && af.tempo > 125;
    default:          return false;
  }
}

// ─── Mood matching (AI → Last.fm → audio features) ───────────────────────────

function matchTrackMood(t: Track, mood: string): boolean {
  // Tier 1: Claude AI multi-mood classification (highest confidence)
  if (t.aiMoods && t.aiMoods.length > 0) return t.aiMoods.includes(mood);
  // Tier 2: Last.fm community tags
  if (t.lastfmTags && t.lastfmTags.length > 0 && tagsMatchMood(t.lastfmTags, mood)) return true;
  // Tier 3: Spotify audio features (ML-computed by Spotify)
  if (t.audioFeatures) return matchesMood(t.audioFeatures, mood, t.name, t.lastfmTags);
  return false;
}

// ─── Single condition match (used by combined filter) ────────────────────────

function matchCondition(t: Track, cond: FilterCondition): boolean {
  const { type, value } = cond;
  switch (type) {
    case 'mood':     return matchTrackMood(t, norm(String(value)));
    case 'language': return trackMatchesLanguage(t, norm(String(value)));
    case 'artist':   return artistMatch(t.artists, String(value));
    case 'release_year_before': {
      const y = parseInt(t.releaseDate?.slice(0, 4) ?? '0', 10);
      return y > 0 && y < Number(value);
    }
    case 'release_year_after': {
      const y = parseInt(t.releaseDate?.slice(0, 4) ?? '0', 10);
      return y > 0 && y > Number(value);
    }
    default: return false;
  }
}

// ─── Main filter ──────────────────────────────────────────────────────────────

export function filterSongs(tracks: Track[], parsed: ParsedPrompt): Track[] {
  const { filterType, filterValue } = parsed;

  switch (filterType) {
    case 'artist': {
      const target = String(filterValue);
      return tracks.filter((t) => artistMatch(t.artists, target));
    }

    case 'language':
    case 'language_or_genre': {
      const lang = norm(String(filterValue));
      return tracks.filter((t) => trackMatchesLanguage(t, lang));
    }

    case 'mood': {
      const mood = norm(String(filterValue));
      return tracks.filter((t) => matchTrackMood(t, mood));
    }

    case 'release_year_before': {
      const year = Number(filterValue);
      return tracks.filter((t) => {
        const y = parseInt(t.releaseDate?.slice(0, 4) ?? '0', 10);
        return y > 0 && y < year;
      });
    }

    case 'release_year_after': {
      const year = Number(filterValue);
      return tracks.filter((t) => {
        const y = parseInt(t.releaseDate?.slice(0, 4) ?? '0', 10);
        return y > 0 && y > year;
      });
    }

    case 'combined': {
      const conditions = parsed.conditions ?? [];
      if (conditions.length === 0) return [];
      return tracks.filter((t) => conditions.every((c) => matchCondition(t, c)));
    }

    default:
      return [];
  }
}

export function filterByArtistFrequency(
  tracks: Track[],
  minCount: number
): PlaylistPreview[] {
  const map = new Map<string, Track[]>();
  for (const track of tracks) {
    const artist = track.artists[0] ?? 'Unknown';
    if (!map.has(artist)) map.set(artist, []);
    map.get(artist)!.push(track);
  }
  const results: PlaylistPreview[] = [];
  map.forEach((artistTracks, artist) => {
    if (artistTracks.length >= minCount) {
      results.push({
        playlistName: artist,
        matchedTracks: artistTracks,
        filterType: 'artist_frequency',
        filterValue: minCount,
      });
    }
  });
  return results.sort((a, b) => b.matchedTracks.length - a.matchedTracks.length);
}
