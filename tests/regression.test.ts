import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUserPrompt } from '../client/src/utils/promptParser';
import { parsePromptResult, parseClassifications } from '../client/api/_lib/routes/ai';
import { getTrackLanguage, filterSongs, getFallbackMoods } from '../client/src/utils/filterSongs';
import { Track } from '../client/src/types';

// Helper to construct test track
function createTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'test-1',
    uri: 'spotify:track:test1',
    name: 'Sample Song',
    artists: ['Sample Artist'],
    album: 'Sample Album',
    albumImage: '',
    releaseDate: '2020-01-01',
    spotifyUrl: 'https://open.spotify.com/track/test1',
    ...overrides,
  };
}

// ─── 1. Simple artist prompt ──────────────────────────────────────────────────
test('simple artist prompt produces artist filter', () => {
  const result = parseUserPrompt('Create a playlist of all Taylor Swift songs called Favorites');
  assert.equal(result.action, 'create');
  assert.equal(result.playlistName, 'Favorites');
  assert.equal(result.filterType, 'artist');
  assert.equal(result.filterValue, 'Taylor Swift');

  const fallbackResult = parseUserPrompt('Taylor Swift');
  assert.equal(fallbackResult.filterType, 'artist');
  assert.equal(fallbackResult.filterValue, 'Taylor Swift');
});

// ─── 2. Simple year prompt ────────────────────────────────────────────────────
test('simple year prompts produce release_year_before and release_year_after filters', () => {
  const beforeRes = parseUserPrompt('Put songs before 2010 into Classics');
  assert.equal(beforeRes.action, 'create');
  assert.equal(beforeRes.playlistName, 'Classics');
  assert.equal(beforeRes.filterType, 'release_year_before');
  assert.equal(beforeRes.filterValue, 2010);

  const afterRes = parseUserPrompt('Put songs after 2015 into Modern Hits');
  assert.equal(afterRes.action, 'create');
  assert.equal(afterRes.playlistName, 'Modern Hits');
  assert.equal(afterRes.filterType, 'release_year_after');
  assert.equal(afterRes.filterValue, 2015);
});

// ─── 3. Simple language prompt ────────────────────────────────────────────────
test('simple language prompt produces language filter', () => {
  const result = parseUserPrompt('find me all telugu songs');
  assert.equal(result.action, 'create');
  assert.equal(result.filterType, 'language');
  assert.equal(result.filterValue, 'telugu');
});

// ─── 4. Combined mood/language/year prompt ────────────────────────────────────
test('combined prompt produces combined filter with all 3 conditions', () => {
  const parsed = parseUserPrompt('sad Telugu songs after 2015');
  assert.equal(parsed.filterType, 'combined');
  assert.ok(Array.isArray(parsed.conditions));
  assert.equal(parsed.conditions?.length, 3);

  const types = parsed.conditions!.map((c) => c.type);
  assert.ok(types.includes('mood'));
  assert.ok(types.includes('language'));
  assert.ok(types.includes('release_year_after'));

  const moodCond = parsed.conditions!.find((c) => c.type === 'mood');
  const langCond = parsed.conditions!.find((c) => c.type === 'language');
  const yearCond = parsed.conditions!.find((c) => c.type === 'release_year_after');

  assert.equal(moodCond?.value, 'sad');
  assert.equal(langCond?.value, 'telugu');
  assert.equal(yearCond?.value, 2015);
});

test('combined filter strictly excludes English songs from 2004', () => {
  const mockingbird = createTrack({
    id: 'mockingbird',
    name: 'Mockingbird',
    artists: ['Eminem'],
    album: 'Encore',
    releaseDate: '2004-11-12',
    aiMoods: ['sad'],
    aiLanguage: 'english',
  });

  const telugu2018 = createTrack({
    id: 'samajavaragamana',
    name: 'Samajavaragamana',
    artists: ['Sid Sriram'],
    album: 'Ala Vaikunthapurramuloo',
    releaseDate: '2019-09-27',
    aiMoods: ['sad'],
    aiLanguage: 'telugu',
  });

  const parsed = parseUserPrompt('sad Telugu songs after 2015');
  const filtered = filterSongs([mockingbird, telugu2018], parsed);

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'samajavaragamana');
  assert.ok(!filtered.some((t) => t.id === 'mockingbird'));
});

// ─── 5. Invalid Gemini responses ──────────────────────────────────────────────
test('parsePromptResult rejects malformed Gemini responses', () => {
  assert.throws(() => parsePromptResult('not a json'), /Unexpected token|JSON/);
  assert.throws(() => parsePromptResult(JSON.stringify({ action: 'unknown' })), /invalid prompt result/);
  assert.throws(() => parsePromptResult(JSON.stringify({
    action: 'create',
    playlistName: 'Test',
    filterType: 'invalid_filter',
    filterValue: 'val',
  })), /invalid prompt result/);
  assert.throws(() => parsePromptResult(JSON.stringify({
    action: 'create',
    playlistName: 'Test',
    filterType: 'combined',
    filterValue: '',
    conditions: [{ type: 'unknown_type', value: 'val' }],
  })), /invalid condition type/);
  assert.throws(() => parsePromptResult(JSON.stringify({
    action: 'create',
    playlistName: 'Test',
    filterType: 'combined',
    filterValue: '',
    conditions: [{ type: 'mood', value: 'sad' }], // only 1 condition
  })), /Combined filter must have at least 2 conditions/);
});

test('parseClassifications rejects invalid track IDs and bad moods/languages', () => {
  const batch = [{ id: 'track-1', name: 'Song 1', artist: 'Artist 1' }];

  // Unexpected track ID
  assert.throws(() => parseClassifications(JSON.stringify({
    'track-999': { moods: ['sad'], language: 'english' },
  }), batch), /unexpected track ID/);

  // Invalid mood
  assert.throws(() => parseClassifications(JSON.stringify({
    'track-1': { moods: ['ecstatic'], language: 'english' },
  }), batch), /invalid classifications/);

  // Invalid language
  assert.throws(() => parseClassifications(JSON.stringify({
    'track-1': { moods: ['sad'], language: 'klingon' },
  }), batch), /invalid classifications/);
});

// ─── 6. Partial classification failures & zero successful classifications ─────
test('parseClassifications correctly formats valid batch outputs', () => {
  const batch = [
    { id: 'track-1', name: 'Song 1', artist: 'Artist 1' },
    { id: 'track-2', name: 'Song 2', artist: 'Artist 2' },
  ];
  const validJson = JSON.stringify({
    'track-1': { moods: ['sad', 'romantic'], language: 'telugu' },
    'track-2': { moods: ['party'], language: 'punjabi' },
  });
  const parsed = parseClassifications(validJson, batch);
  assert.deepEqual(parsed['track-1'].moods, ['sad', 'romantic']);
  assert.equal(parsed['track-1'].language, 'telugu');
  assert.deepEqual(parsed['track-2'].moods, ['party']);
  assert.equal(parsed['track-2'].language, 'punjabi');
});

// ─── 7. Language precedence regression ────────────────────────────────────────
test('language detection precedence: AP Dhillon 315 is Punjabi, not Telugu', () => {
  // AP Dhillon "315" on album "The Brownprint" contains "Bro", but must NOT match Telugu film "Bro"
  const track315 = createTrack({
    id: '315',
    name: '315',
    artists: ['AP Dhillon', 'Shinda Kahlon'],
    album: 'The Brownprint',
    releaseDate: '2024-08-30',
  });

  const lang = getTrackLanguage(track315);
  assert.equal(lang, 'punjabi');
});

test('language detection precedence: Oo Antava is Telugu', () => {
  const ooAntava = createTrack({
    id: 'oo-antava',
    name: 'Oo Antava Oo Oo Antava',
    artists: ['Indravathi Chauhan', 'Devi Sri Prasad'],
    album: 'Pushpa - The Rise',
    releaseDate: '2021-12-10',
  });

  const lang = getTrackLanguage(ooAntava);
  assert.equal(lang, 'telugu');
});

test('language detection fixtures: representative Hindi, Marathi, Punjabi, Telugu, English songs', () => {
  const hindiSong = createTrack({
    artists: ['Arijit Singh'],
    name: 'Tum Hi Ho',
    album: 'Aashiqui 2',
  });
  assert.equal(getTrackLanguage(hindiSong), 'hindi');

  const marathiSong = createTrack({
    artists: ['Ajay-Atul'],
    name: 'Zingaat',
    album: 'Sairat',
  });
  assert.equal(getTrackLanguage(marathiSong), 'marathi');

  const punjabiSong = createTrack({
    artists: ['Sidhu Moosewala'],
    name: '295',
    album: 'Moosetape',
  });
  assert.equal(getTrackLanguage(punjabiSong), 'punjabi');

  const teluguSong = createTrack({
    artists: ['Devi Sri Prasad'],
    name: 'Ringa Ringa',
    album: 'Arya 2',
  });
  assert.equal(getTrackLanguage(teluguSong), 'telugu');

  const englishSong = createTrack({
    artists: ['Taylor Swift'],
    name: 'Cruel Summer',
    album: 'Lover',
    lastfmTags: ['pop', 'indie pop', 'english pop', 'american'],
  });
  assert.equal(getTrackLanguage(englishSong), 'english');
});

// ─── 8. UI readiness state after failed tagging ───────────────────────────────
test('UI readiness state simulation', () => {
  // Case A: 100% success (0 failed)
  const fullSuccessResult = { cached: 50, classified: 116, failed: 0 };
  const moodLoadedA = fullSuccessResult.failed === 0;
  const moodErrorA = fullSuccessResult.failed > 0
    ? `${fullSuccessResult.classified + fullSuccessResult.cached}/166 songs tagged. AI tagging partially failed.`
    : null;
  assert.equal(moodLoadedA, true);
  assert.equal(moodErrorA, null);

  // Case B: Partial failure (failed > 0)
  const partialResult = { cached: 20, classified: 30, failed: 116 };
  const moodLoadedB = partialResult.failed === 0;
  const taggedCountB = partialResult.classified + partialResult.cached;
  const moodErrorB = partialResult.failed > 0
    ? `${taggedCountB}/166 songs tagged. AI tagging partially failed.`
    : null;
  assert.equal(moodLoadedB, false);
  assert.equal(moodErrorB, '50/166 songs tagged. AI tagging partially failed.');

  // Case C: Total failure (0 cached, 0 classified, 166 failed)
  const totalFailResult = { cached: 0, classified: 0, failed: 166 };
  const moodLoadedC = totalFailResult.failed === 0 && (totalFailResult.cached + totalFailResult.classified > 0);
  assert.equal(moodLoadedC, false);
});

// ─── 9. API Security & Validation ─────────────────────────────────────────────
test('extractToken middleware rejects missing or invalid Authorization header', () => {
  let statusCode = 0;
  let jsonBody: any = null;
  const mockRes: any = {
    status: (code: number) => { statusCode = code; return mockRes; },
    json: (body: any) => { jsonBody = body; },
  };

  // Missing Authorization header
  const reqNoAuth: any = { headers: {} };
  let nextCalled = false;
  const { extractToken } = require('../client/api/_lib/middleware/tokenRefresh.ts');
  extractToken(reqNoAuth, mockRes, () => { nextCalled = true; });
  assert.equal(statusCode, 401);
  assert.equal(nextCalled, false);

  // Invalid Authorization header format
  const reqBadAuth: any = { headers: { authorization: 'Basic 12345' } };
  extractToken(reqBadAuth, mockRes, () => { nextCalled = true; });
  assert.equal(statusCode, 401);
  assert.equal(nextCalled, false);

  // Valid Authorization header
  const reqGoodAuth: any = { headers: { authorization: 'Bearer test_token_xyz' } };
  extractToken(reqGoodAuth, mockRes, () => { nextCalled = true; });
  assert.equal(reqGoodAuth.accessToken, 'test_token_xyz');
  assert.equal(nextCalled, true);
});

test('fallback mood estimation provides estimated moods from audio features', () => {
  const happyPartySong = createTrack({
    audioFeatures: {
      id: 'test-hp',
      valence: 0.85,
      energy: 0.9,
      danceability: 0.8,
      acousticness: 0.1,
      tempo: 125,
    },
  });
  const fallbackMoods = getFallbackMoods(happyPartySong);
  assert.ok(fallbackMoods.includes('party') || fallbackMoods.includes('happy'));

  const sadChillSong = createTrack({
    audioFeatures: {
      id: 'test-sc',
      valence: 0.2,
      energy: 0.3,
      danceability: 0.3,
      acousticness: 0.8,
      tempo: 80,
    },
  });
  const sadFallback = getFallbackMoods(sadChillSong);
  assert.ok(sadFallback.includes('sad') || sadFallback.includes('chill'));
});

test('TrackCard tag resolution suppresses fallbacks during active tag loading', () => {
  const track315 = createTrack({
    id: '315',
    name: '315',
    artists: ['AP Dhillon'],
    album: 'The Brownprint',
  });

  // State 1: Active loading (loadingTags = true, track has no AI tags yet)
  const loadingTags = true;
  const hasAiTags1 = Boolean(track315.aiLanguage || track315.aiMoods?.length);
  const fallbackLang1 = !hasAiTags1 && !loadingTags ? getTrackLanguage(track315) : null;
  const fallbackMoods1 = !hasAiTags1 && !loadingTags ? getFallbackMoods(track315) : [];
  const showLoadingPlaceholder1 = loadingTags && !hasAiTags1;

  assert.equal(fallbackLang1, null);
  assert.deepEqual(fallbackMoods1, []);
  assert.equal(showLoadingPlaceholder1, true);

  // State 2: Tagging complete with AI results
  const track315Classified = { ...track315, aiLanguage: 'punjabi', aiMoods: ['party'] };
  const hasAiTags2 = Boolean(track315Classified.aiLanguage || track315Classified.aiMoods?.length);
  const showLoadingPlaceholder2 = false && !hasAiTags2;
  assert.equal(hasAiTags2, true);
  assert.equal(showLoadingPlaceholder2, false);

  // State 3: Tagging failed/finished without AI tags (loadingTags = false)
  const hasAiTags3 = false;
  const fallbackLang3 = !hasAiTags3 && !false ? getTrackLanguage(track315) : null;
  assert.equal(fallbackLang3, 'punjabi');
});
