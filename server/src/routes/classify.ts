import { Router, Request, Response } from 'express';
import axios from 'axios';

// franc@5 is CommonJS
// eslint-disable-next-line @typescript-eslint/no-var-requires
const franc = require('franc') as (text: string, opts?: { minLength?: number }) => string;

const router = Router();

// ISO 639-3 codes franc returns → our language keys
const FRANC_TO_LANG: Record<string, string> = {
  tel: 'telugu',
  tam: 'tamil',
  kan: 'kannada',
  mal: 'malayalam',
  hin: 'hindi',
  pan: 'punjabi',
  ben: 'bengali',
  urd: 'urdu',
  mar: 'marathi',
  guj: 'gujarati',
  ori: 'odia',
  eng: 'english',
  kor: 'korean',
  jpn: 'japanese',
  ara: 'arabic',
  cmn: 'chinese',
  zho: 'chinese',
  fra: 'french',
  spa: 'spanish',
  por: 'portuguese',
};

// Franc codes that map to "some Indian language (not English)"
// Used when the specific Indian language can't be determined from lyrics
const INDIAN_CODES = new Set(['hin', 'pan', 'tel', 'tam', 'kan', 'mal', 'ben', 'urd', 'mar', 'guj', 'ori', 'hrx', 'bho']);

async function fetchLyrics(artist: string, title: string): Promise<string | null> {
  try {
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
    const { data } = await axios.get(url, { timeout: 5000 });
    const lyrics = data?.lyrics ?? '';
    return lyrics.length > 30 ? lyrics : null;
  } catch {
    return null;
  }
}

// POST /api/classify/language
// Body: { tracks: [{ id, artist, title }] }
// Returns: { results: Record<id, string | null> }
//   string = detected language key, null = could not determine
router.post('/language', async (req: Request, res: Response) => {
  const tracks: { id: string; artist: string; title: string }[] = req.body?.tracks ?? [];
  if (!Array.isArray(tracks) || tracks.length === 0) {
    res.status(400).json({ error: 'tracks array required' });
    return;
  }

  const results: Record<string, string | null> = {};

  // Process in waves of 8 concurrent requests, 300ms between waves
  const CONCURRENCY = 8;
  for (let i = 0; i < tracks.length; i += CONCURRENCY) {
    const wave = tracks.slice(i, i + CONCURRENCY);
    await Promise.all(wave.map(async ({ id, artist, title }) => {
      const lyrics = await fetchLyrics(artist, title);
      if (!lyrics) { results[id] = null; return; }

      const detected = franc(lyrics, { minLength: 20 });

      if (detected === 'und') { results[id] = null; return; }

      // If franc detects a Javanese/Malay/etc. false positive on what is clearly
      // Devanagari or other Indian script, fall back to Unicode detection
      if (!FRANC_TO_LANG[detected]) {
        // Check if lyrics contain Indian scripts directly
        if (/[ऀ-ॿऀ-ॿ]/.test(lyrics)) { results[id] = 'hindi'; return; }
        if (/[ఀ-౿]/.test(lyrics)) { results[id] = 'telugu'; return; }
        if (/[஀-௿]/.test(lyrics)) { results[id] = 'tamil'; return; }
        if (/[ಀ-೿]/.test(lyrics)) { results[id] = 'kannada'; return; }
        if (/[ഀ-ൿ]/.test(lyrics)) { results[id] = 'malayalam'; return; }
        if (/[਀-੿]/.test(lyrics)) { results[id] = 'punjabi'; return; }
        results[id] = null;
        return;
      }

      results[id] = FRANC_TO_LANG[detected];
    }));

    if (i + CONCURRENCY < tracks.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  res.json({ results });
});

export default router;
