import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { spotifyApi, playlistApi, authApi } from '../services/api';
import { Spinner } from '../components/Spinner';
import { TrackRow } from '../components/TrackRow';
import { ErrorBanner } from '../components/ErrorBanner';

const EXAMPLE_PROMPTS = [
  'Create a playlist of all Karan Aujla songs called Karan Hits',
  'Put all Punjabi songs into a playlist called Punjabi Vibes',
  'Make a playlist of Justin Bieber songs called Bieber Classics',
  'Put songs before 2015 into Old Favorites',
  'Create playlists by artist for artists with more than 5 liked songs',
];

export function Dashboard() {
  const navigate = useNavigate();
  const { profile, setProfile, tracks, totalTracks, isScanning, scanError, scanLikedSongs, setPreviewGroups } = useApp();

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(!profile);

  useEffect(() => {
    if (profile) return;
    spotifyApi
      .getProfile()
      .then((res) => {
        setProfile(res.data);
        setLoadingProfile(false);
      })
      .catch(() => {
        navigate('/');
      });
  }, [profile, setProfile, navigate]);

  const handleScan = () => {
    scanLikedSongs();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!tracks.length) {
      setPromptError('Please scan your liked songs first.');
      return;
    }

    setIsGenerating(true);
    setPromptError(null);

    try {
      const res = await playlistApi.preview(prompt, tracks);
      const groups = res.data.groups;
      if (!groups.length || groups.every((g) => !g.matchedTracks.length)) {
        setPromptError('No matching songs found for your prompt.');
        return;
      }
      setPreviewGroups(groups);
      navigate('/preview');
    } catch (err: any) {
      setPromptError(err?.response?.data?.error || 'Failed to generate preview.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogout = async () => {
    await authApi.logout();
    setProfile(null);
    navigate('/');
  };

  if (loadingProfile) {
    return (
      <div className="center-page">
        <Spinner size={48} />
        <p style={{ color: '#b3b3b3', marginTop: '1rem' }}>Loading your profile…</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dash-header">
        <div className="dash-brand">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#1DB954">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <span>Spotify Library Organizer</span>
        </div>
        {profile && (
          <div className="dash-profile">
            {profile.images?.[0]?.url && (
              <img src={profile.images[0].url} alt={profile.display_name} className="profile-avatar" />
            )}
            <div className="profile-info">
              <span className="profile-name">{profile.display_name}</span>
              <span className="profile-email">{profile.email}</span>
            </div>
            <button className="btn-ghost" onClick={handleLogout}>Disconnect</button>
          </div>
        )}
      </header>

      <main className="dash-main">
        {/* Scan section */}
        <section className="card scan-card">
          <div className="scan-info">
            <h2>Liked Songs Library</h2>
            {totalTracks > 0 ? (
              <p className="scan-count">
                <span className="green">{totalTracks.toLocaleString()}</span> songs scanned
              </p>
            ) : (
              <p className="scan-hint">Scan your library to get started</p>
            )}
          </div>
          <button
            className="btn-spotify"
            onClick={handleScan}
            disabled={isScanning}
          >
            {isScanning ? <><Spinner size={16} /> &nbsp;Scanning…</> : totalTracks > 0 ? 'Re-scan Library' : 'Scan Liked Songs'}
          </button>
        </section>

        {scanError && <ErrorBanner message={scanError} />}

        {/* Prompt section */}
        <section className="card prompt-card">
          <h2>Create a Playlist</h2>
          <p className="prompt-hint">Describe what playlist you want to create in plain English.</p>
          <textarea
            className="prompt-input"
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setPromptError(null); }}
            placeholder='Example: Put all Punjabi songs into a playlist called Punjabi Vibes'
            rows={3}
            disabled={!tracks.length || isGenerating}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate();
            }}
          />
          <div className="example-prompts-row">
            {EXAMPLE_PROMPTS.map((ex) => (
              <button key={ex} className="chip" onClick={() => { setPrompt(ex); setPromptError(null); }}>
                {ex}
              </button>
            ))}
          </div>
          {promptError && <ErrorBanner message={promptError} onDismiss={() => setPromptError(null)} />}
          <button
            className="btn-spotify btn-large"
            onClick={handleGenerate}
            disabled={!prompt.trim() || !tracks.length || isGenerating}
          >
            {isGenerating ? <><Spinner size={16} /> &nbsp;Generating Preview…</> : 'Generate Playlist Preview →'}
          </button>
          {!tracks.length && (
            <p className="muted">Scan your liked songs above to enable playlist generation.</p>
          )}
        </section>

        {/* Recent tracks */}
        {tracks.length > 0 && (
          <section className="card tracks-card">
            <h2>Recently Scanned Tracks <span className="badge">{totalTracks}</span></h2>
            <div className="tracks-list">
              {tracks.slice(0, 20).map((track, i) => (
                <TrackRow key={track.id} track={track} index={i} />
              ))}
              {tracks.length > 20 && (
                <p className="muted" style={{ textAlign: 'center', padding: '1rem' }}>
                  + {tracks.length - 20} more songs scanned
                </p>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
