import axios from 'axios';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export function createSpotifyClient(accessToken: string) {
  return axios.create({
    baseURL: SPOTIFY_API_BASE,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
}
