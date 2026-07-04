import { useState, useEffect, useCallback } from 'react';
import { SpotifyUser } from '../types';
import { fetchUserProfile } from '../utils/spotifyApi';

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

  function logout() {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expiry');
    setUser(null);
    window.location.href = '/';
  }

  return { user, profileLoading, error, isAuthenticated, logout, refetch };
}
