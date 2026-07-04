import OpenAI from 'openai';

export interface ParsedPrompt {
  action: 'create_playlist' | 'create_playlists_by_artist';
  playlistName: string;
  filterType: 'artist' | 'language_or_genre' | 'release_year' | 'artist_frequency';
  filterValue: string;
  filterOperator?: 'before' | 'after' | 'equals';
  minSongCount?: number;
}

// Heuristic parser — no API key required for common patterns
function heuristicParse(prompt: string): ParsedPrompt | null {
  const p = prompt.toLowerCase().trim();

  // Artist frequency: "create playlists by artist for artists with more than N liked songs"
  const freqMatch = p.match(/(?:playlists? by artist|group by artist).*?(?:more than|at least|over)\s+(\d+)/i);
  if (freqMatch) {
    return {
      action: 'create_playlists_by_artist',
      playlistName: '',
      filterType: 'artist_frequency',
      filterValue: '',
      minSongCount: parseInt(freqMatch[1], 10),
    };
  }

  // Release year: "songs before/after YYYY into <name>"
  const yearMatch = p.match(/(before|after|from)\s+(\d{4}).*?(?:into|called|named)\s+["']?([^"']+?)["']?$/i);
  if (yearMatch) {
    const [, op, year, name] = yearMatch;
    return {
      action: 'create_playlist',
      playlistName: name.trim(),
      filterType: 'release_year',
      filterValue: year,
      filterOperator: op === 'after' ? 'after' : 'before',
    };
  }

  // Named playlist with artist
  const artistMatch = p.match(
    /(?:all\s+)?([a-z\s]+?)(?:\s+songs?).*?(?:into|called|named|playlist called|playlist named)\s+["']?([^"']+?)["']?$/i
  );
  if (artistMatch) {
    const [, artistOrGenre, name] = artistMatch;
    const genre = detectGenre(artistOrGenre.trim());
    return {
      action: 'create_playlist',
      playlistName: name.trim(),
      filterType: genre ? 'language_or_genre' : 'artist',
      filterValue: artistOrGenre.trim(),
    };
  }

  // "Create a playlist of all X songs called Y"
  const ofMatch = p.match(
    /(?:create|make).*?(?:of|with)\s+(?:all\s+)?([a-z\s]+?)(?:\s+songs?).*?(?:called|named)\s+["']?([^"']+?)["']?$/i
  );
  if (ofMatch) {
    const [, artistOrGenre, name] = ofMatch;
    const genre = detectGenre(artistOrGenre.trim());
    return {
      action: 'create_playlist',
      playlistName: name.trim(),
      filterType: genre ? 'language_or_genre' : 'artist',
      filterValue: artistOrGenre.trim(),
    };
  }

  return null;
}

const GENRES_LANGUAGES = [
  'punjabi', 'hindi', 'tamil', 'telugu', 'malayalam', 'kannada', 'bengali',
  'rap', 'hip hop', 'hip-hop', 'pop', 'rock', 'jazz', 'classical', 'edm',
  'electronic', 'r&b', 'rnb', 'country', 'metal', 'indie', 'bollywood',
  'k-pop', 'kpop', 'latin', 'reggae', 'blues', 'soul', 'folk',
];

function detectGenre(value: string): boolean {
  return GENRES_LANGUAGES.some((g) => value.toLowerCase().includes(g));
}

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

async function aiParse(prompt: string): Promise<ParsedPrompt | null> {
  const client = getOpenAI();
  if (!client) return null;

  const systemPrompt = `You are a playlist organizer assistant. Parse user prompts about creating Spotify playlists and return structured JSON.

Return ONLY valid JSON with this schema:
{
  "action": "create_playlist" | "create_playlists_by_artist",
  "playlistName": string,
  "filterType": "artist" | "language_or_genre" | "release_year" | "artist_frequency",
  "filterValue": string,
  "filterOperator": "before" | "after" | "equals" (only for release_year),
  "minSongCount": number (only for artist_frequency)
}

Examples:
- "Create a playlist of all Karan Aujla songs called Karan Hits" → {"action":"create_playlist","playlistName":"Karan Hits","filterType":"artist","filterValue":"Karan Aujla"}
- "Put all Punjabi songs into a playlist called Punjabi Vibes" → {"action":"create_playlist","playlistName":"Punjabi Vibes","filterType":"language_or_genre","filterValue":"Punjabi"}
- "Put songs before 2015 into Old Songs" → {"action":"create_playlist","playlistName":"Old Songs","filterType":"release_year","filterValue":"2015","filterOperator":"before"}
- "Create playlists by artist for artists with more than 5 liked songs" → {"action":"create_playlists_by_artist","playlistName":"","filterType":"artist_frequency","filterValue":"","minSongCount":5}`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content) as ParsedPrompt;
  } catch {
    return null;
  }
}

export async function parseUserPrompt(prompt: string): Promise<ParsedPrompt> {
  // Try AI first, fall back to heuristic
  const aiResult = await aiParse(prompt);
  if (aiResult && aiResult.filterType) return aiResult;

  const heuristic = heuristicParse(prompt);
  if (heuristic) return heuristic;

  // Last resort: treat as artist filter, extract any quoted name or guess playlist name
  const quotedName = prompt.match(/["']([^"']+)["']/)?.[1];
  return {
    action: 'create_playlist',
    playlistName: quotedName || 'My Playlist',
    filterType: 'artist',
    filterValue: prompt,
  };
}
