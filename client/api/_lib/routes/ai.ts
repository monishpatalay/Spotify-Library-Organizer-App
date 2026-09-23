import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { requireSpotifyUser } from '../middleware/tokenRefresh.js';

const router = Router();

const requestCounts = new Map<string, { count: number; resetAt: number }>();

router.use(requireSpotifyUser);
router.use((req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).spotifyUserId as string;
  const now = Date.now();
  const current = requestCounts.get(userId);

  if (!current || now >= current.resetAt) {
    requestCounts.set(userId, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }

  if (current.count >= 30) {
    res.set('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
    res.status(429).json({ error: 'AI request limit reached' });
    return;
  }

  current.count += 1;
  next();
});

// ─── Persistent AI cache ──────────────────────────────────────────────────────
// Stores mood + language per track ID so rescans only classify new songs.

interface CacheEntry { moods: string[]; language: string | null; }

// Vercel's filesystem is read-only apart from /tmp, which is per-container and
// ephemeral — the cache still avoids re-classifying within a warm container,
// and every miss falls through to the AI provider as normal.
const CACHE_FILE = process.env.VERCEL
  ? path.join('/tmp', 'ai_cache.json')
  : path.join(__dirname, '../../../../server/data/ai_cache.json');

function readCache(): Record<string, CacheEntry> {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  } catch { return {}; }
}

function writeCache(cache: Record<string, CacheEntry>) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
  } catch { /* non-fatal */ }
}

// In-memory cache (loaded once, flushed periodically)
let memCache: Record<string, CacheEntry> = readCache();
let dirtyCount = 0;

function getCached(id: string): CacheEntry | null {
  return memCache[id] ?? null;
}

function setCache(entries: Record<string, CacheEntry>) {
  Object.assign(memCache, entries);
  dirtyCount += Object.keys(entries).length;
  if (dirtyCount >= 50) { writeCache(memCache); dirtyCount = 0; }
}

// Flush on process exit
process.on('exit', () => writeCache(memCache));
process.on('SIGINT', () => { writeCache(memCache); process.exit(); });

// ─── Gemini client ────────────────────────────────────────────────────────────

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY must be set');
  return apiKey;
}

export async function generateJson(systemInstruction: string, input: string, maxOutputTokens: number): Promise<string> {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(25_000),
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': getApiKey(),
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          parts: [{ text: input }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens,
      },
    }),
  });

  if (!response.ok) throw new Error(`Gemini API request failed (${response.status})`);

  const data = await response.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!text) throw new Error('Gemini API returned no text');
  return text;
}

// ─── POST /api/ai/parse-prompt ────────────────────────────────────────────────

const ACTIONS = new Set(['create', 'find', 'create_multiple']);
const FILTER_TYPES = new Set([
  'mood', 'language', 'artist', 'release_year_before', 'release_year_after',
  'artist_frequency', 'combined',
]);
const CONDITION_TYPES = new Set([
  'mood', 'language', 'artist', 'release_year_before', 'release_year_after',
]);

export function parsePromptResult(raw: string) {
  const result = JSON.parse(raw) as Record<string, unknown>;
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Gemini returned an invalid prompt result');
  }

  const action = String(result.action ?? '');
  const playlistName = typeof result.playlistName === 'string' ? result.playlistName.trim() : '';
  const filterType = String(result.filterType ?? '');
  const filterValue = result.filterValue;
  const conditions = result.conditions;

  if (!ACTIONS.has(action)
    || playlistName.length === 0
    || playlistName.length > 100
    || !FILTER_TYPES.has(filterType)
    || !['string', 'number'].includes(typeof filterValue)) {
    throw new Error('Gemini returned an invalid prompt result');
  }

  if (conditions !== undefined && !Array.isArray(conditions)) {
    throw new Error('Gemini returned an invalid conditions list');
  }

  const condList = Array.isArray(conditions) ? conditions : [];
  if (condList.length > 5) {
    throw new Error('Gemini returned too many conditions');
  }

  for (const cond of condList) {
    if (!cond || typeof cond !== 'object' || Array.isArray(cond)) {
      throw new Error('Gemini returned an invalid condition');
    }
    const cType = String((cond as any).type ?? '');
    const cVal = (cond as any).value;
    if (!CONDITION_TYPES.has(cType)) {
      throw new Error(`Gemini returned an invalid condition type: ${cType}`);
    }
    if (cType.startsWith('release_year_')) {
      const y = Number(cVal);
      if (isNaN(y) || y < 1900 || y > 2100) {
        throw new Error(`Gemini returned an invalid year condition value: ${cVal}`);
      }
    } else if (typeof cVal !== 'string' || !cVal.trim()) {
      throw new Error(`Gemini returned an invalid condition value for ${cType}`);
    }
  }

  if (filterType === 'combined' && condList.length < 2) {
    throw new Error('Combined filter must have at least 2 conditions');
  }

  return {
    action,
    playlistName,
    filterType,
    filterValue: filterType === 'combined' ? '' : filterValue,
    conditions: condList.map((c) => ({
      type: String((c as any).type),
      value: String((c as any).type).startsWith('release_year_') ? Number((c as any).value) : String((c as any).value).trim(),
    })),
  };
}

router.post('/parse-prompt', async (req: Request, res: Response) => {
  const { prompt } = req.body as { prompt?: string };
  if (!prompt?.trim()) { res.status(400).json({ error: 'prompt is required' }); return; }
  if (prompt.length > 500) { res.status(400).json({ error: 'prompt is too long' }); return; }

  try {
    const raw = await generateJson(
      `You are the AI brain of a Spotify Library Organizer.
Parse the user's request and return ONLY valid JSON with this shape:
{
  "action": "create" | "find" | "create_multiple",
  "playlistName": string,
  "filterType": "mood" | "language" | "artist" | "release_year_before" | "release_year_after" | "artist_frequency" | "combined",
  "filterValue": string | number,
  "conditions": [{"type": "mood" | "language" | "artist" | "release_year_before" | "release_year_after", "value": string | number}]
}

Rules:
- "combined" for multi-condition requests:
  e.g. "sad Telugu songs after 2015" →
  filterType: "combined", filterValue: "",
  conditions: [
    {"type": "mood", "value": "sad"},
    {"type": "language", "value": "telugu"},
    {"type": "release_year_after", "value": 2015}
  ]
- moods: sad, happy, party, chill, energetic, workout, romantic
- languages: telugu, hindi, punjabi, tamil, kannada, malayalam, bengali, marathi, gujarati, urdu, english, korean, japanese, arabic, chinese, spanish, french
- artist_frequency: group by artists (filterValue = min song count)
- Single condition: filterType + filterValue, conditions: []
- Generate an appropriate playlistName if user didn't specify (e.g. "Sad Telugu Songs")
- Return ONLY the JSON object, nothing else.`,
      prompt,
      1024
    );
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    res.json(parsePromptResult(jsonStr));
  } catch {
    res.status(500).json({ error: 'AI parse failed' });
  }
});

// ─── Classification ───────────────────────────────────────────────────────────

interface ClassifyInput {
  id: string;
  name: string;
  artist: string;
  album?: string;
  tags?: string[];
}

interface ClassifyResult { moods: string[]; language: string | null; }

const MOODS = new Set(['sad', 'happy', 'party', 'chill', 'energetic', 'workout', 'romantic']);
const LANGUAGES = new Set([
  'hindi', 'telugu', 'tamil', 'punjabi', 'kannada', 'malayalam', 'bengali',
  'marathi', 'gujarati', 'urdu',
  'english', 'korean', 'japanese', 'arabic', 'chinese', 'spanish', 'french',
]);

export function parseClassifications(raw: string, batch: ClassifyInput[]): Record<string, ClassifyResult> {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Gemini returned invalid classifications');
  }

  const allowedIds = new Set(batch.map((track) => track.id));
  if (Object.keys(parsed).some((id) => !allowedIds.has(id))) {
    throw new Error('Gemini returned an unexpected track ID');
  }

  const results: Record<string, ClassifyResult> = {};
  for (const track of batch) {
    const value = parsed[track.id] as Partial<ClassifyResult> | undefined;
    const language = value?.language;
    if (!value
      || !Array.isArray(value.moods)
      || value.moods.length > 3
      || value.moods.some((mood) => typeof mood !== 'string' || !MOODS.has(mood))
      || (language !== null && (typeof language !== 'string' || !LANGUAGES.has(language)))) {
      throw new Error('Gemini returned invalid classifications');
    }
    results[track.id] = { moods: [...new Set(value.moods)], language };
  }

  return results;
}

const CLASSIFY_SYSTEM = `You classify songs by mood AND language. Songs can have MULTIPLE moods.

=== MOOD — Assign ALL moods that genuinely fit (1–3 per song) ===
ALLOWED MOODS ONLY: "sad", "happy", "party", "chill", "energetic", "workout", "romantic". Do NOT use any other mood names.

STEP 1 — ROMANTIC CHECK (run first, combine with other moods freely):
If the song name OR Last.fm tags contain ANY of these → add "romantic" to the moods list:
  English: love, lover, heart, miss you, kiss, baby, darling, sweetheart, crush, romance,
           romantic, forever, together, hold me, need you, without you, thinking of you, stay, wedding
  Hindi/Urdu: ishq, pyaar, mohabbat, dil, tera, tere, tujhe, tujhse, saathiya, pehla nasha,
              dard, intezaar, rabba, yaad, milne, bewafa, teri baahon
  Telugu: prema, priya, manasuku, nuvvu
  Punjabi: mahi, dildarian, ni main
A romantic song CAN also be sad (e.g. a heartbreak ballad) or happy/party (upbeat love song).

STEP 2 — FEEL OF THE SONG: use the Last.fm tags plus what you know of the song and artist
(tempo, energy, lyrics, how it is normally listened to) and add every mood that genuinely fits.
Do not default to "chill" — use it only for songs that really are calm or soft.

Dedup the list. Keep max 3 moods, strongest fit first.
Examples:
  "Kal Ho Naa Ho" (love + bittersweet) → ["romantic", "sad"]
  "Chaiyya Chaiyya" (high energy dance, spiritual) → ["party", "energetic", "happy"]
  "Tujh Mein Rab Dikhta Hai" (soft love, low energy) → ["romantic", "chill"]
  "Blinding Lights" (upbeat, energetic, slight romance) → ["energetic", "happy", "romantic"]
  "Someone Like You" (heartbreak ballad) → ["sad", "romantic"]
  "Galti Se Mistake" (fun party song) → ["party", "happy"]

=== LANGUAGE — ARTIST is PRIMARY. English title ≠ English song. ===
Step 1: identify the artist's primary language:
  Punjabi: AP Dhillon, Sidhu Moosewala, Diljit Dosanjh, Karan Aujla, Shubh, Akhil, Parmish Verma,
    Hardy Sandhu, Garry Sandhu, Imran Khan
  Hindi singers: Arijit Singh, Jubin Nautiyal, Atif Aslam, KK, Udit Narayan, Sonu Nigam,
    Neha Kakkar, Armaan Malik, Mohit Chauhan, Rahat Fateh Ali Khan, Darshan Raval,
    B Praak, Jassie Gill, Raftaar, Badshah, Yo Yo Honey Singh, Divine
  Telugu: Indravathi Chauhan, Devi Sri Prasad, DSP, Thaman S, Sid Sriram (Telugu), Kaala Bhairava, Rahul Sipligunj, Harika Narayan, Sunitha
  Tamil: AR Rahman, Anirudh Ravichander, Haricharan, Benny Dayal, Sid Sriram (Tamil)
  Marathi: Ajay-Atul, Swapnil Bandodkar, Avadhoot Gupte, Bela Shende, Adarsh Shinde
  Kannada: Vijay Prakash, Rajesh Krishnan
  Malayalam: KS Chitra, MG Sreekumar, Vineeth Sreenivasan
  Bengali: Arijit Singh (Bengali), Nachiketa, Lopamudra
  Korean: BTS, BLACKPINK, EXO, TWICE, Stray Kids, aespa, IVE, NewJeans
  English: Ed Sheeran, Taylor Swift, Drake, Coldplay, The Weeknd, Billie Eilish, Post Malone,
    Eminem, Ariana Grande, Justin Bieber, Harry Styles, Olivia Rodrigo, Dua Lipa, Sam Smith
Step 2: Use that language, regardless of whether the song title is in English.
Step 3: If album/tags clearly indicate a different language than the artist's default, use that.
null ONLY if you truly cannot determine after checking artist, album, and tags.

Valid: hindi, telugu, tamil, punjabi, kannada, malayalam, bengali, marathi, gujarati, urdu, english,
korean, japanese, arabic, chinese, spanish, french, null

=== OUTPUT ===
Return ONLY valid JSON. No markdown, no explanation. "moods" is an ARRAY (never a string).
{"id1":{"moods":["sad","romantic"],"language":"hindi"},"id2":{"moods":["party","energetic"],"language":"english"}}`;

async function classifyBatch(
  batch: ClassifyInput[]
): Promise<Record<string, ClassifyResult>> {
  const songList = batch.map((s) => {
    const tags = s.tags?.slice(0, 5).join(',') ?? '';
    return `${s.id}|${s.name}|${s.artist}|${s.album ?? ''}|${tags}`;
  }).join('\n');

  const raw = await generateJson(
    CLASSIFY_SYSTEM,
    `Classify (id|name|artist|album|tags):\n${songList}`,
    4096
  );
  const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return parseClassifications(jsonStr, batch);
}

// ─── POST /api/ai/classify ────────────────────────────────────────────────────
// Returns cached results immediately; only calls Gemini for uncached tracks.
// Body:  { tracks: [{id, name, artist, album, tags}] }
// Returns: { results: Record<id, { mood, language }>, cached: number, classified: number, failed: number }

router.post('/classify', async (req: Request, res: Response) => {
  const tracks: ClassifyInput[] = req.body?.tracks ?? [];
  if (!Array.isArray(tracks) || tracks.length === 0) {
    res.status(400).json({ error: 'tracks array required' });
    return;
  }
  if (tracks.length > 100) {
    res.status(400).json({ error: 'at most 100 tracks are allowed' });
    return;
  }
  if (tracks.some((track) => !track
    || typeof track.id !== 'string' || track.id.length === 0 || track.id.length > 128
    || typeof track.name !== 'string' || track.name.length > 300
    || typeof track.artist !== 'string' || track.artist.length > 300)) {
    res.status(400).json({ error: 'invalid track data' });
    return;
  }

  const results: Record<string, ClassifyResult> = {};
  const uncached: ClassifyInput[] = [];

  // Serve from cache first
  for (const t of tracks) {
    const cached = getCached(t.id);
    if (cached) {
      results[t.id] = cached;
    } else {
      uncached.push(t);
    }
  }

  const cachedCount = tracks.length - uncached.length;
  if (uncached.length === 0) {
    res.json({ results, cached: cachedCount, classified: 0, failed: 0 });
    return;
  }

  // Call Gemini only for uncached tracks
  try {
    getApiKey();
  } catch (e: any) {
    // Return cached results even if Gemini is unavailable
    for (const t of uncached) results[t.id] = { moods: [], language: null };
    res.status(503).json({ error: e.message, results, cached: cachedCount, classified: 0, failed: uncached.length });
    return;
  }

  const BATCH = 30;
  const newEntries: Record<string, CacheEntry> = {};
  let classifiedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < uncached.length; i += BATCH) {
    const batch = uncached.slice(i, i + BATCH);
    let batchResult: Record<string, ClassifyResult> | null = null;

    // Two attempts per batch
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        batchResult = await classifyBatch(batch);
        break;
      } catch {
        if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (batchResult) {
      classifiedCount += Object.keys(batchResult).length;
      Object.assign(results, batchResult);
      Object.assign(newEntries, batchResult);
    } else {
      failedCount += batch.length;
      for (const t of batch) results[t.id] = { moods: [], language: null };
    }

    if (i + BATCH < uncached.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Persist only successful new entries to cache
  if (Object.keys(newEntries).length > 0) {
    setCache(newEntries);
  }

  if (classifiedCount === 0 && cachedCount === 0) {
    res.status(502).json({
      error: 'AI classification failed for all tracks',
      results,
      cached: 0,
      classified: 0,
      failed: failedCount,
    });
    return;
  }

  if (failedCount > 0) {
    res.status(207).json({
      results,
      cached: cachedCount,
      classified: classifiedCount,
      failed: failedCount,
    });
    return;
  }

  res.json({
    results,
    cached: cachedCount,
    classified: classifiedCount,
    failed: 0,
  });
});

export default router;
