import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { spotifyApi } from '../services/api';
import { useApp } from '../context/AppContext';
import { Spinner } from '../components/Spinner';

export function Callback() {
  const navigate = useNavigate();
  const { setProfile } = useApp();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');

    if (!success) {
      setError('Authentication failed. Please try again.');
      return;
    }

    spotifyApi
      .getProfile()
      .then((res) => {
        setProfile(res.data);
        navigate('/dashboard');
      })
      .catch(() => {
        setError('Failed to load your Spotify profile. Please reconnect.');
      });
  }, [navigate, setProfile]);

  if (error) {
    return (
      <div className="center-page">
        <div className="error-banner">{error}</div>
        <button className="btn-spotify" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="center-page">
      <Spinner size={48} />
      <p style={{ color: '#b3b3b3', marginTop: '1rem' }}>Connecting your Spotify account…</p>
    </div>
  );
}
