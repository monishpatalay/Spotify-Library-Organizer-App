import { useState, useEffect, useCallback } from 'react';
import { Track } from '../types';
import { fetchAllLikedSongs, fetchAudioFeatures } from '../utils/spotifyApi';
import { fetchLastFmTags } from '../utils/lastfmApi';
import { classifyTrackLanguages } from '../utils/classifyApi';
import { aiClassify } from '../utils/aiApi';

const CACHE_KEY = 'spotify_library_v4'; // bumped: aiMood → aiMoods (multi-mood array)
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  tracks: Track[];
  timestamp: number;
  moodLoaded: boolean;
}

function saveCache(tracks: Track[], moodLoaded: boolean) {
  try {
    const entry: CacheEntry = { tracks, timestamp: Date.now(), moodLoaded };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch { /* storage full — skip silently */ }
}

function loadCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry;
  } catch { return null; }
}

export function useLikedSongs() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksBase, setTracksBase] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ fetched: 0, total: 0 });
  const [scanned, setScanned] = useState(false);
  const [moodLoading, setMoodLoading] = useState(false);
  const [moodLoaded, setMoodLoaded] = useState(false);
  const [moodError, setMoodError] = useState<string | null>(null);
  const [moodStatus, setMoodStatus] = useState('');
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    const cached = loadCache();
    if (!cached) return;
    setTracks(cached.tracks);
    setTracksBase(cached.tracks);
    setScanned(true);
    setMoodLoaded(cached.moodLoaded);
    setFromCache(true);
  }, []);

  const loadMoodTags = useCallback(async (baseTracks: Track[]) => {
    if (baseTracks.length === 0) return;
    setMoodLoading(true);
    setMoodError(null);

    try {
      // Step 1: Last.fm tags (genre + language signals)
      setMoodStatus('Fetching Last.fm tags…');
      const tagMap = await fetchLastFmTags(baseTracks);
      const withTags = baseTracks.map((t) => ({ ...t, lastfmTags: tagMap[t.id] ?? [] }));
      setTracks(withTags);

      // Step 2: AI classification (mood + language) with real-time progress.
      // Server returns cached results instantly for known tracks — only new songs hit Claude.
      setMoodStatus(`AI classifying songs… 0/${withTags.length}`);
      const [aiMap, langMap] = await Promise.all([
        aiClassify(withTags, (done, total, fromCache) => {
          const label = fromCache > 0 ? ` (${fromCache} from cache)` : '';
          setMoodStatus(`AI classifying… ${done}/${total}${label}`);
        }),
        classifyTrackLanguages(withTags),
      ]);

      const enriched = withTags.map((t) => {
        const ai = aiMap[t.id];
        return {
          ...t,
          aiMoods: ai?.moods ?? [],
          aiLanguage: ai?.language ?? null,
          detectedLanguage: langMap[t.id] ?? null,
        };
      });
      setTracks(enriched);
      saveCache(enriched, true);
      setMoodLoaded(true);
    } catch (e: any) {
      setMoodError(e.message ?? 'Failed to load mood data');
      // Still allow searching — fallback filters (Last.fm tags + audio features) still work
      setMoodLoaded(true);
    } finally {
      setMoodLoading(false);
      setMoodStatus('');
    }
  }, []);

  const scan = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProgress({ fetched: 0, total: 0 });
    setMoodLoaded(false);
    setMoodError(null);
    setMoodStatus('');
    setFromCache(false);
    try {
      const results = await fetchAllLikedSongs((fetched, total) => {
        setProgress({ fetched, total });
      });

      // Spotify audio features (valence, energy, danceability, tempo) — AI mood fallback
      const afMap = await fetchAudioFeatures(results.map((t) => t.id));
      const withAF = results.map((t) =>
        afMap[t.id] ? { ...t, audioFeatures: afMap[t.id] } : t
      );

      setTracksBase(withAF);
      setTracks(withAF);
      setScanned(true);
      saveCache(withAF, false);
      setLoading(false);
      await loadMoodTags(withAF);
    } catch (e: any) {
      setError(e.message ?? 'Failed to scan liked songs');
      setLoading(false);
    }
  }, [loadMoodTags]);

  const rescan = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    setTracks([]);
    setTracksBase([]);
    setScanned(false);
    setMoodLoaded(false);
    setMoodError(null);
    setMoodStatus('');
    setFromCache(false);
    scan();
  }, [scan]);

  const retryMoodTags = useCallback(() => {
    loadMoodTags(tracksBase);
  }, [loadMoodTags, tracksBase]);

  return {
    tracks, loading, error, progress, scanned, scan, rescan,
    moodLoading, moodLoaded, moodError, moodStatus, retryMoodTags, fromCache,
  };
}
