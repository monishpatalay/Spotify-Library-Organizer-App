import React from 'react';
import { authApi } from '../services/api';

export function Landing() {
  const handleConnect = () => {
    window.location.href = authApi.getLoginUrl();
  };

  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');

  return (
    <div className="landing">
      <div className="landing-content">
        <div className="logo">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="#1DB954">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <h1>Spotify Library Organizer</h1>
        </div>

        <p className="tagline">Turn your messy Liked Songs into clean playlists with one prompt.</p>

        <div className="feature-list">
          <div className="feature">
            <span className="feature-icon">🎵</span>
            <span>Scan your entire Liked Songs library</span>
          </div>
          <div className="feature">
            <span className="feature-icon">✨</span>
            <span>Describe what you want in plain English</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🎧</span>
            <span>Create organized playlists instantly</span>
          </div>
        </div>

        <div className="example-prompts">
          <p className="examples-label">Try prompts like:</p>
          <div className="example-chip">"Create a playlist of all Karan Aujla songs"</div>
          <div className="example-chip">"Put all Punjabi songs into Punjabi Vibes"</div>
          <div className="example-chip">"Make a playlist of songs before 2015"</div>
          <div className="example-chip">"Create playlists by artist with 5+ songs"</div>
        </div>

        {error && (
          <div className="error-banner" style={{ marginBottom: '1.5rem' }}>
            ⚠ {error === 'spotify_auth_denied'
              ? 'Spotify authorization was denied.'
              : error === 'state_mismatch'
              ? 'Security check failed. Please try again.'
              : 'Authentication failed. Please try again.'}
          </div>
        )}

        <button className="btn-spotify btn-large" onClick={handleConnect}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          Connect Spotify
        </button>
      </div>
    </div>
  );
}
