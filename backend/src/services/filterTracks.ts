import { ParsedPrompt } from './promptParser';

export interface Track {
  id: string;
  uri: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: string;
  albumImage: string;
  releaseDate: string;
  spotifyUrl: string;
}

export interface PlaylistGroup {
  playlistName: string;
  matchedTracks: Track[];
  filterType: string;
  filterValue: string;
}

const PUNJABI_KEYWORDS = [
  'punjabi', 'bhangra', 'diljit', 'sidhu moosewala', 'karan aujla', 'babbu maan',
  'ammy virk', 'parmish verma', 'jasmine sandlas', 'harrdy sandhu', 'guru randhawa',
  'ap dhillon', 'shubh', 'imran khan', 'badshah', 'jass manak',
];

const HINDI_KEYWORDS = [
  'bollywood', 'hindi', 'arijit', 'atif aslam', 'shreya ghoshal', 'sonu nigam',
  'kumar sanu', 'udit narayan', 'lata mangeshkar', 'kishore kumar',
];

const GENRE_LANGUAGE_MAP: Record<string, string[]> = {
  punjabi: PUNJABI_KEYWORDS,
  hindi: HINDI_KEYWORDS,
  bollywood: HINDI_KEYWORDS,
  'hip hop': ['rap', 'hip hop', 'hip-hop', 'trap', 'drake', 'kendrick', 'j. cole', 'travis scott'],
  'hip-hop': ['rap', 'hip hop', 'hip-hop', 'trap'],
  rap: ['rap', 'hip hop', 'trap'],
  pop: ['pop'],
  rock: ['rock', 'metal', 'punk', 'alternative'],
  edm: ['edm', 'electronic', 'house', 'techno', 'trance'],
  electronic: ['edm', 'electronic', 'house', 'techno'],
  'k-pop': ['k-pop', 'kpop', 'bts', 'blackpink', 'twice', 'exo'],
  kpop: ['k-pop', 'kpop', 'bts', 'blackpink', 'twice'],
  latin: ['latin', 'reggaeton', 'salsa', 'cumbia', 'bachata'],
  jazz: ['jazz'],
  classical: ['classical', 'orchestra', 'symphony'],
  country: ['country'],
  'r&b': ['r&b', 'rnb', 'soul', 'rhythm and blues'],
  soul: ['soul', 'r&b', 'rnb'],
  reggae: ['reggae', 'dancehall'],
  indie: ['indie', 'alternative'],
};

function matchesLanguageOrGenre(track: Track, filterValue: string): boolean {
  const val = filterValue.toLowerCase();
  const keywords = GENRE_LANGUAGE_MAP[val] || [val];

  const artistNames = track.artists.map((a) => a.name.toLowerCase()).join(' ');
  const albumName = track.album.toLowerCase();
  const trackName = track.name.toLowerCase();

  return keywords.some(
    (kw) =>
      artistNames.includes(kw) ||
      albumName.includes(kw) ||
      trackName.includes(kw)
  );
}

function matchesArtist(track: Track, filterValue: string): boolean {
  const val = filterValue.toLowerCase();
  return track.artists.some((a) => a.name.toLowerCase().includes(val));
}

function matchesReleaseYear(track: Track, filterValue: string, operator?: string): boolean {
  const year = parseInt(track.releaseDate?.split('-')[0] || '0', 10);
  const targetYear = parseInt(filterValue, 10);
  if (!year || !targetYear) return false;

  if (operator === 'after') return year > targetYear;
  if (operator === 'before') return year < targetYear;
  return year === targetYear;
}

export function filterTracks(tracks: Track[], parsed: ParsedPrompt): PlaylistGroup[] {
  if (parsed.action === 'create_playlists_by_artist') {
    const artistMap = new Map<string, Track[]>();
    for (const track of tracks) {
      for (const artist of track.artists) {
        const existing = artistMap.get(artist.name) || [];
        existing.push(track);
        artistMap.set(artist.name, existing);
      }
    }

    const minCount = parsed.minSongCount || 5;
    const groups: PlaylistGroup[] = [];
    artistMap.forEach((artistTracks, artistName) => {
      if (artistTracks.length >= minCount) {
        groups.push({
          playlistName: artistName,
          matchedTracks: artistTracks,
          filterType: 'artist',
          filterValue: artistName,
        });
      }
    });

    return groups.sort((a, b) => b.matchedTracks.length - a.matchedTracks.length);
  }

  let matched: Track[];
  switch (parsed.filterType) {
    case 'artist':
      matched = tracks.filter((t) => matchesArtist(t, parsed.filterValue));
      break;
    case 'language_or_genre':
      matched = tracks.filter((t) => matchesLanguageOrGenre(t, parsed.filterValue));
      break;
    case 'release_year':
      matched = tracks.filter((t) =>
        matchesReleaseYear(t, parsed.filterValue, parsed.filterOperator)
      );
      break;
    default:
      matched = [];
  }

  return [
    {
      playlistName: parsed.playlistName,
      matchedTracks: matched,
      filterType: parsed.filterType,
      filterValue: parsed.filterValue,
    },
  ];
}
