import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Track, SpotifyProfile, PlaylistGroup } from '../types';
import { spotifyApi } from '../services/api';

interface AppState {
  profile: SpotifyProfile | null;
  tracks: Track[];
  totalTracks: number;
  isScanning: boolean;
  scanError: string | null;
  previewGroups: PlaylistGroup[];
}

interface AppContextValue extends AppState {
  setProfile: (p: SpotifyProfile | null) => void;
  scanLikedSongs: () => Promise<void>;
  setPreviewGroups: (groups: PlaylistGroup[]) => void;
  clearPreview: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<SpotifyProfile | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [totalTracks, setTotalTracks] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [previewGroups, setPreviewGroups] = useState<PlaylistGroup[]>([]);

  const scanLikedSongs = useCallback(async () => {
    setIsScanning(true);
    setScanError(null);
    try {
      const res = await spotifyApi.getLikedSongs();
      setTracks(res.data.tracks);
      setTotalTracks(res.data.total);
    } catch (err: any) {
      setScanError(err?.response?.data?.error || 'Failed to scan liked songs');
    } finally {
      setIsScanning(false);
    }
  }, []);

  const clearPreview = useCallback(() => setPreviewGroups([]), []);

  return (
    <AppContext.Provider
      value={{
        profile,
        tracks,
        totalTracks,
        isScanning,
        scanError,
        previewGroups,
        setProfile,
        scanLikedSongs,
        setPreviewGroups,
        clearPreview,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
