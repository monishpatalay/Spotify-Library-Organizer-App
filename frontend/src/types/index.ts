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

export interface SpotifyProfile {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string }>;
  followers: { total: number };
}

export interface ParsedPrompt {
  action: 'create_playlist' | 'create_playlists_by_artist';
  playlistName: string;
  filterType: 'artist' | 'language_or_genre' | 'release_year' | 'artist_frequency';
  filterValue: string;
  filterOperator?: 'before' | 'after' | 'equals';
  minSongCount?: number;
}

export interface PlaylistGroup {
  playlistName: string;
  matchedTracks: Track[];
  filterType: string;
  filterValue: string;
}
