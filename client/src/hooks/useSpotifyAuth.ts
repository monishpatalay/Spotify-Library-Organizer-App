import { useState, useEffect, useCallback } from 'react';
import { SpotifyUser } from '../types';
import { fetchUserProfile } from '../utils/spotifyApi';
import { clearLibraryCache } from './useLikedSongs';

export function useSpotifyAuth() {
  const [user, setUser] = useState<SpotifyUser | null>(null);
  // Profile is cosmetic — don't block the UI while it loads
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const isAuthenticated = !!localStorage.getItem('spotify_access_token');

  useEffect(() => {
    if (!isAuthenticated) return;
    setError(null);
    setProfileLoading(true);
    let alive = true;
    // Debounce prevents StrictMode's double-invoke from sending two requests
    const timer = setTimeout(() => {
      fetchUserProfile()
        .then((u) => { if (alive) setUser(u); })
        .catch((e) => { if (alive) setError(e.message); })
        .finally(() => { if (alive) setProfileLoading(false); });
    }, 80);
    return () => { alive = false; clearTimeout(timer); };
  }, [isAuthenticated, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  async function logout() {
    // Clear the HttpOnly cookies first (page scripts can't remove them), then local
    // state, then one full page load. Clearing state before the await re-rendered the
    // dashboard into a second, client-side redirect that raced this one.
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expiry');
    clearLibraryCache();
    window.location.href = '/';
  }

  return { user, profileLoading, error, isAuthenticated, logout, refetch };
}
