import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const router = Router();

// ─── Persistent AI cache ──────────────────────────────────────────────────────
// Stores mood + language per track ID so rescans only classify new songs.

interface CacheEntry { moods: string[]; language: string | null; }

const CACHE_FILE = path.join(__dirname, '../../data/ai_cache.json');

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

// ─── Anthropic client ─────────────────────────────────────────────────────────

function getClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set in server/.env');
  return new Anthropic({ apiKey: key });
}

// ─── POST /api/ai/parse-prompt ────────────────────────────────────────────────

router.post('/parse-prompt', async (req: Request, res: Response) => {
  const { prompt } = req.body as { prompt?: string };
  if (!prompt?.trim()) { res.status(400).json({ error: 'prompt is required' }); return; }

  try {
    const client = getClient();
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: `You are the AI brain of a Spotify Library Organizer.
Parse the user's request and return ONLY valid JSON with this shape:
{
  "action": "create" | "find" | "create_multiple",
  "playlistName": string,
  "filterType": "mood" | "language" | "artist" | "release_year_before" | "release_year_after" | "artist_frequency" | "combined",
  "filterValue": string | number,
  "conditions": [{"type": string, "value": string | number}]
}

Rules:
- "combined" for multi-condition: "sad Telugu songs after 2015" → conditions array, filterValue ""
- moods: sad, happy, party, chill, energetic, workout, romantic
- languages: telugu, hindi, punjabi, tamil, kannada, malayalam, bengali, english, korean, japanese, arabic, chinese, spanish, french
- artist_frequency: group by artists (filterValue = min song count)
- Single condition: filterType + filterValue, conditions: []
- Generate a good playlistName if user didn't specify
- Return ONLY the JSON object, nothing else.`,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as any).text?.trim() ?? '';
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    res.json(JSON.parse(jsonStr));
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? 'AI parse failed' });
  }
});

// ─── Classification ───────────────────────────────────────────────────────────

interface ClassifyInput {
  id: string;
  name: string;
  artist: string;
  album?: string;
  valence?: number;
  energy?: number;
  danceability?: number;
  tempo?: number;
  tags?: string[];
}

interface ClassifyResult { moods: string[]; language: string | null; }

const CLASSIFY_SYSTEM = `You classify songs by mood AND language. Songs can have MULTIPLE moods.

=== MOOD — Assign ALL moods that genuinely fit (1–3 per song) ===

STEP 1 — ROMANTIC CHECK (run first, combine with other moods freely):
If the song name OR Last.fm tags contain ANY of these → add "romantic" to the moods list:
  English: love, lover, heart, miss you, kiss, baby, darling, sweetheart, crush, romance,
           romantic, forever, together, hold me, need you, without you, thinking of you, stay, wedding
  Hindi/Urdu: ishq, pyaar, mohabbat, dil, tera, tere, tujhe, tujhse, saathiya, pehla nasha,
              dard, intezaar, rabba, yaad, milne, bewafa, teri baahon
  Telugu: prema, priya, manasuku, nuvvu
  Punjabi: mahi, dildarian, ni main
A romantic song CAN also be sad (e.g. a heartbreak ballad) or happy/party (upbeat love song).

STEP 2 — AUDIO FEATURE RULES (check ALL, add every rule that matches):
1. valence < 0.35 → add "sad"
2. energy > 0.78 AND danceability > 0.68 → add "party"
3. energy > 0.78 AND tempo > 128 → add "workout"
4. energy > 0.75 AND not already in "party"/"workout" → add "energetic"
5. valence > 0.62 AND energy > 0.55 → add "happy"
6. valence > 0.38 AND energy < 0.65 AND danceability < 0.7 → add "romantic" (if not already)
7. energy < 0.45 AND not already in other moods → add "chill"
8. If NOTHING matched yet → ["chill"]

Dedup the list. Keep max 3 moods, strongest fit first. Use song/artist knowledge too.
Examples:
  "Kal Ho Naa Ho" (love + bittersweet valence ~0.3) → ["romantic", "sad"]
  "Chaiyya Chaiyya" (high energy dance, spiritual) → ["party", "energetic", "happy"]
  "Tujh Mein Rab Dikhta Hai" (soft love, low energy) → ["romantic", "chill"]
  "Blinding Lights" (upbeat, energetic, slight romance) → ["energetic", "happy", "romantic"]
  "Someone Like You" (heartbreak ballad) → ["sad", "romantic"]
  "Galti Se Mistake" (fun party song) → ["party", "happy"]

=== LANGUAGE — ARTIST is PRIMARY. English title ≠ English song. ===
Step 1: identify the artist's primary language:
  Hindi singers: Arijit Singh, Jubin Nautiyal, Atif Aslam, KK, Udit Narayan, Sonu Nigam,
    Neha Kakkar, Armaan Malik (Hindi), Mohit Chauhan, Rahat Fateh Ali Khan, Darshan Raval,
    B Praak, Jassie Gill, Raftaar, Badshah, Yo Yo Honey Singh, Divine, AP Dhillon (Hindi songs)
  Punjabi: Sidhu Moosewala, Diljit Dosanjh, Karan Aujla, Shubh, Akhil, Parmish Verma,
    Hardy Sandhu, Garry Sandhu, Imran Khan (Punjabi), AP Dhillon (Punjabi songs)
  Telugu: DSP, Thaman S, Sid Sriram (Telugu), Kaala Bhairava, Rahul Sipligunj, Harika Narayan, Sunitha
  Tamil: AR Rahman, Anirudh Ravichander, Haricharan, Benny Dayal, Sid Sriram (Tamil)
  Kannada: Vijay Prakash, Rajesh Krishnan
  Malayalam: KS Chitra, MG Sreekumar, Vineeth Sreenivasan
  Bengali: Arijit Singh (Bengali), Nachiketa, Lopamudra
  Korean: BTS, BLACKPINK, EXO, TWICE, Stray Kids, aespa, IVE, NewJeans
  English: Ed Sheeran, Taylor Swift, Drake, Coldplay, The Weeknd, Billie Eilish, Post Malone,
    Eminem, Ariana Grande, Justin Bieber, Harry Styles, Olivia Rodrigo, Dua Lipa, Sam Smith
Step 2: Use that language, regardless of whether the song title is in English.
Step 3: If album/tags clearly indicate a different language than the artist's default, use that.
null ONLY if you truly cannot determine after checking artist, album, and tags.

Valid: hindi, telugu, tamil, punjabi, kannada, malayalam, bengali, english,
korean, japanese, arabic, chinese, spanish, french, null

=== OUTPUT ===
Return ONLY valid JSON. No markdown, no explanation. "moods" is an ARRAY (never a string).
{"id1":{"moods":["sad","romantic"],"language":"hindi"},"id2":{"moods":["party","energetic"],"language":"english"}}`;

async function classifyBatch(
  client: Anthropic,
  batch: ClassifyInput[]
): Promise<Record<string, ClassifyResult>> {
  const songList = batch.map((s) => {
    const af = [
      s.valence != null ? `v:${s.valence.toFixed(2)}` : '',
      s.energy != null ? `e:${s.energy.toFixed(2)}` : '',
      s.danceability != null ? `d:${s.danceability.toFixed(2)}` : '',
      s.tempo != null ? `t:${Math.round(s.tempo)}` : '',
    ].filter(Boolean).join(' ');
    const tags = s.tags?.slice(0, 5).join(',') ?? '';
    return `${s.id}|${s.name}|${s.artist}|${s.album ?? ''}|${af || 'no-af'}|${tags}`;
  }).join('\n');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: CLASSIFY_SYSTEM,
    messages: [{ role: 'user', content: `Classify (id|name|artist|album|audio|tags):\n${songList}` }],
  });

  const raw = (message.content[0] as any).text?.trim() ?? '';
  const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(jsonStr);
}

// ─── POST /api/ai/classify ────────────────────────────────────────────────────
// Returns cached results immediately; only calls Claude for uncached tracks.
// Body:  { tracks: [{id, name, artist, album, valence, energy, danceability, tempo, tags}] }
// Returns: { results: Record<id, { mood, language }>, cached: number, classified: number }

router.post('/classify', async (req: Request, res: Response) => {
  const tracks: ClassifyInput[] = req.body?.tracks ?? [];
  if (!Array.isArray(tracks) || tracks.length === 0) {
    res.status(400).json({ error: 'tracks array required' });
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

  if (uncached.length === 0) {
    res.json({ results, cached: tracks.length, classified: 0 });
    return;
  }

  // Call Claude only for uncached tracks
  let client: Anthropic;
  try {
    client = getClient();
  } catch (e: any) {
    // Return cached results even if Claude is unavailable
    for (const t of uncached) results[t.id] = { moods: [], language: null };
    res.status(503).json({ error: e.message, results, cached: tracks.length - uncached.length });
    return;
  }

  const BATCH = 30;
  const newEntries: Record<string, CacheEntry> = {};

  for (let i = 0; i < uncached.length; i += BATCH) {
    const batch = uncached.slice(i, i + BATCH);
    let batchResult: Record<string, ClassifyResult> | null = null;

    // Two attempts per batch
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        batchResult = await classifyBatch(client, batch);
        break;
      } catch {
        if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (batchResult) {
      Object.assign(results, batchResult);
      Object.assign(newEntries, batchResult);
    } else {
      for (const t of batch) results[t.id] = { moods: [], language: null };
    }

    if (i + BATCH < uncached.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Persist new entries to cache
  setCache(newEntries);

  res.json({
    results,
    cached: tracks.length - uncached.length,
    classified: uncached.length,
  });
});

export default router;
