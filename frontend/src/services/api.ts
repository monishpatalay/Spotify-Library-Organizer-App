import axios, { AxiosError } from 'axios';
import { Track, SpotifyProfile, ParsedPrompt, PlaylistGroup } from '../types';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    if (err.response?.status === 401 && err.config?.url !== '/auth/refresh') {
      try {
        await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        return api.request(err.config!);
      } catch {
        window.location.href = '/';
      }
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  getLoginUrl: () => '/api/auth/login',
  getStatus: () => api.get<{ authenticated: boolean }>('/auth/status'),
  logout: () => api.post('/auth/logout'),
};

export const spotifyApi = {
  getProfile: () => api.get<SpotifyProfile>('/spotify/profile'),
  getLikedSongs: () => api.get<{ tracks: Track[]; total: number }>('/spotify/liked-songs'),
};

export const playlistApi = {
  preview: (prompt: string, tracks: Track[]) =>
    api.post<{ parsed: ParsedPrompt; groups: PlaylistGroup[] }>('/playlist/preview', {
      prompt,
      tracks,
    }),
  create: (group: PlaylistGroup) =>
    api.post<{ playlistId: string; playlistUrl: string; tracksAdded: number }>(
      '/playlist/create',
      { group }
    ),
};
