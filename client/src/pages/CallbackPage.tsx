import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // The token arrives in the URL fragment (never sent to a server); errors in the query.
    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');
    const error = new URLSearchParams(window.location.search).get('error');

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
    // The refresh token now lives in an HttpOnly cookie; drop any copy an older version stored.
    localStorage.removeItem('spotify_refresh_token');
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
