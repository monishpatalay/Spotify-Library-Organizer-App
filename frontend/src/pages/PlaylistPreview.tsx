import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { playlistApi } from '../services/api';
import { Spinner } from '../components/Spinner';
import { TrackRow } from '../components/TrackRow';
import { ErrorBanner } from '../components/ErrorBanner';
import { PlaylistGroup } from '../types';

function GroupPreview({ group, onCreateSuccess }: { group: PlaylistGroup; onCreateSuccess: (url: string) => void }) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ url: string; count: number } | null>(null);
  const [showAll, setShowAll] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await playlistApi.create(group);
      setCreated({ url: res.data.playlistUrl, count: res.data.tracksAdded });
      onCreateSuccess(res.data.playlistUrl);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create playlist.');
    } finally {
      setCreating(false);
    }
  };

  const displayTracks = showAll ? group.matchedTracks : group.matchedTracks.slice(0, 10);

  return (
    <div className="card preview-group">
      <div className="preview-group-header">
        <div>
          <h2 className="playlist-name">{group.playlistName || `${group.filterValue} Songs`}</h2>
          <p className="muted">
            {group.matchedTracks.length} track{group.matchedTracks.length !== 1 ? 's' : ''} matched
            {group.filterType && ` · Filter: ${group.filterType.replace(/_/g, ' ')}`}
          </p>
        </div>
        <div className="preview-actions">
          {created ? (
            <a href={created.url} target="_blank" rel="noopener noreferrer" className="btn-spotify">
              Open in Spotify ↗
            </a>
          ) : (
            <button className="btn-spotify" onClick={handleCreate} disabled={creating}>
              {creating ? <><Spinner size={16} /> &nbsp;Creating…</> : 'Create Playlist on Spotify'}
            </button>
          )}
        </div>
      </div>

      {created && (
        <div className="success-banner">
          ✓ Playlist created with {created.count} tracks!
        </div>
      )}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="tracks-list">
        {displayTracks.map((track, i) => (
          <TrackRow key={track.id} track={track} index={i} />
        ))}
      </div>

      {group.matchedTracks.length > 10 && (
        <button className="btn-ghost show-more" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show less' : `Show all ${group.matchedTracks.length} tracks`}
        </button>
      )}
    </div>
  );
}

export function PlaylistPreview() {
  const navigate = useNavigate();
  const { previewGroups, clearPreview } = useApp();
  const [createdUrls, setCreatedUrls] = useState<string[]>([]);

  if (!previewGroups.length) {
    navigate('/dashboard');
    return null;
  }

  const handleBack = () => {
    clearPreview();
    navigate('/dashboard');
  };

  const emptyGroups = previewGroups.filter((g) => !g.matchedTracks.length);
  const filledGroups = previewGroups.filter((g) => g.matchedTracks.length > 0);

  return (
    <div className="dashboard">
      <header className="dash-header">
        <button className="btn-ghost" onClick={handleBack}>← Back to Dashboard</button>
        <h1 style={{ color: '#fff', fontSize: '1.2rem' }}>Playlist Preview</h1>
        <div />
      </header>

      <main className="dash-main">
        <div className="preview-meta">
          <p className="muted">
            {filledGroups.length} playlist{filledGroups.length !== 1 ? 's' : ''} ready ·{' '}
            {filledGroups.reduce((s, g) => s + g.matchedTracks.length, 0)} total tracks
          </p>
        </div>

        {emptyGroups.length > 0 && (
          <ErrorBanner
            message={`No matching songs found for: ${emptyGroups.map((g) => g.playlistName || g.filterValue).join(', ')}`}
          />
        )}

        {filledGroups.map((group, i) => (
          <GroupPreview
            key={i}
            group={group}
            onCreateSuccess={(url) => setCreatedUrls((prev) => [...prev, url])}
          />
        ))}

        {createdUrls.length > 0 && (
          <div className="card" style={{ textAlign: 'center' }}>
            <p className="green" style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
              {createdUrls.length} playlist{createdUrls.length !== 1 ? 's' : ''} created successfully!
            </p>
            <button className="btn-ghost" onClick={handleBack}>← Create Another</button>
          </div>
        )}
      </main>
    </div>
  );
}
