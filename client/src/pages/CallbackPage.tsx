import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresIn = params.get('expires_in');
    const error = params.get('error');

    if (error) {
      navigate(`/?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!accessToken) {
      // React StrictMode runs effects twice in development. The second run sees
      // an empty URL because the first run already called navigate('/dashboard').
      // If a token was stored by the first run, proceed to dashboard.
      const stored = localStorage.getItem('spotify_access_token');
      if (stored) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/?error=auth_failed');
      }
      return;
    }

    localStorage.setItem('spotify_access_token', accessToken);
    if (refreshToken) localStorage.setItem('spotify_refresh_token', refreshToken);
    if (expiresIn) {
      localStorage.setItem(
        'spotify_token_expiry',
        String(Date.now() + parseInt(expiresIn, 10) * 1000)
      );
    }

    navigate('/dashboard', { replace: true });
  }, [navigate]);

  return <LoadingSpinner message="Connecting to Spotify..." />;
}
