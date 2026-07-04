export interface AudioFeatures {
  id: string;
  valence: number;      // 0=sad → 1=happy
  energy: number;       // 0=calm → 1=intense
  danceability: number; // 0=least → 1=most danceable
  acousticness: number; // 0=electric → 1=acoustic
  tempo: number;        // BPM
}

export interface Track {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  album: string;
  albumImage: string;
  releaseDate: string;
  spotifyUrl: string;
  genres?: string[];
  audioFeatures?: AudioFeatures;
  lastfmTags?: string[];
  detectedLanguage?: string | null; // from lyrics.ovh + franc ML
  aiMoods?: string[];               // from Claude — multiple moods per song (primary first)
  aiLanguage?: string | null;       // from Claude classification
}

export interface PlaylistPreview {
  playlistName: string;
  matchedTracks: Track[];
  filterType: string;
  filterValue: string | number;
}

export interface FilterCondition {
  type: string;
  value: string | number;
}

export interface ParsedPrompt {
  action: string;
  playlistName: string;
  filterType: string;
  filterValue: string | number;
  conditions?: FilterCondition[];
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
}
