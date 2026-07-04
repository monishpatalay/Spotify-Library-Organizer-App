import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import TrackTable from '../components/TrackTable';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useSpotifyAuth } from '../hooks/useSpotifyAuth';
import { createPlaylist } from '../utils/spotifyApi';
import { PlaylistPreview } from '../types';

interface LocationState {
  preview?: PlaylistPreview;
  previews?: PlaylistPreview[];
  isMulti: boolean;
}

interface CreateResult {
  playlistId?: string;
  playlistUrl?: string;
  quota_blocked?: boolean;
  trackUris?: string[];
  name: string;
}

export default function PlaylistPreviewPage() {
  const { user, logout } = useSpotifyAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [activePreviews, setActivePreviews] = useState<PlaylistPreview[]>(() => {
    if (!state) return [];
    if (state.isMulti) return state.previews ?? [];
    return state.preview ? [state.preview] : [];
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CreateResult[]>([]);
  const [copiedUris, setCopiedUris] = useState<Record<string, boolean>>({});

  if (!state || activePreviews.length === 0) {
    return (
      <div style={styles.page}>
        <Navbar user={user} onLogout={logout} />
        <div style={styles.empty}>
          <p style={{ color: '#B3B3B3' }}>No preview data. Go back and generate a playlist first.</p>
          <button style={styles.secondaryBtn} className="btn-outline" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  function handleRemoveTrack(previewIndex: number, trackId: string) {
    setActivePreviews((prev) =>
      prev.map((p, i) =>
        i === previewIndex
          ? { ...p, matchedTracks: p.matchedTracks.filter((t) => t.id !== trackId) }
          : p
      )
    );
  }

  async function handleCreatePlaylists() {
    setCreating(true);
    setError(null);
    const allResults: CreateResult[] = [];
    for (const preview of activePreviews) {
      try {
        const uris = preview.matchedTracks.map((t) => t.uri);
        const res = await createPlaylist(preview.playlistName, uris);
        allResults.push({ ...res, name: preview.playlistName });
      } catch (e: any) {
        allResults.push({ name: preview.playlistName, quota_blocked: true, trackUris: preview.matchedTracks.map(t => t.uri) });
        setError(e.message ?? 'Error creating one or more playlists');
      }
    }
    setResults(allResults);
    setCreating(false);
  }

  function copyUris(name: string, uris: string[]) {
    navigator.clipboard.writeText(uris.join('\n')).then(() => {
      setCopiedUris((prev) => ({ ...prev, [name]: true }));
      setTimeout(() => setCopiedUris((prev) => ({ ...prev, [name]: false })), 2000);
    });
  }

  const totalTracks = activePreviews.reduce((sum, p) => sum + p.matchedTracks.length, 0);
  const done = results.length > 0;

  return (
    <div style={styles.page}>
      <Navbar user={user} onLogout={logout} />
      <main style={styles.main}>
        <button style={styles.backBtn} className="back-btn" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>

        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>Playlist Preview</h1>
          <div style={styles.summaryChips}>
            <span style={styles.chip}>
              <span style={styles.chipNum}>{activePreviews.length}</span> playlist{activePreviews.length !== 1 ? 's' : ''}
            </span>
            <span style={styles.chip}>
              <span style={styles.chipNum}>{totalTracks.toLocaleString()}</span> tracks
            </span>
          </div>
        </div>

        {/* Results */}
        {done && (
          <div style={styles.resultsSection} className="fade-up">
            {results.map((r) => (
              <div key={r.name} style={r.quota_blocked ? styles.warningCard : styles.successCard}>
                {r.quota_blocked ? (
                  <>
                    <p style={styles.resultTitle}>✅ "{r.name}" created!</p>
                    {r.playlistUrl && (
                      <a href={r.playlistUrl} target="_blank" rel="noreferrer" style={styles.openLink}>
                        Open in Spotify →
                      </a>
                    )}
                    <p style={styles.warningText}>
                      ⚠️ Tracks couldn't be added automatically (Spotify quota limit in Development Mode).
                    </p>
                    {r.trackUris && (
                      <button
                        style={styles.copyBtn}
                        className="btn-outline"
                        onClick={() => copyUris(r.name, r.trackUris!)}
                      >
                        {copiedUris[r.name] ? '✓ Copied!' : '📋 Copy Track URIs'}
                      </button>
                    )}
                    <p style={styles.quotaNote}>
                      Request Extended Quota in your Spotify Developer Dashboard to auto-add tracks.
                    </p>
                  </>
                ) : (
                  <>
                    <p style={styles.resultTitle}>🎉 "{r.name}" created successfully!</p>
                    {r.playlistUrl && (
                      <a href={r.playlistUrl} target="_blank" rel="noreferrer" style={styles.openLink}>
                        Open in Spotify →
                      </a>
                    )}
                  </>
                )}
              </div>
            ))}
            <button style={styles.secondaryBtn} className="btn-outline" onClick={() => navigate('/dashboard')}>
              ← Back to Dashboard
            </button>
          </div>
        )}

        {error && <ErrorMessage message={error} />}

        {/* Each preview */}
        {activePreviews.map((preview, pi) => (
          <section key={pi} style={styles.previewSection}>
            <div style={styles.previewHeader}>
              <div>
                <h2 style={styles.playlistName}>
                  <span style={styles.playlistNameIcon}>📋</span>
                  {preview.playlistName}
                </h2>
                <p style={styles.previewMeta}>
                  <span style={styles.metaBadge}>{preview.filterType}</span>
                  <span style={{ color: '#535353' }}>{String(preview.filterValue)}</span>
                  <span style={styles.trackCount}>{preview.matchedTracks.length} tracks</span>
                </p>
              </div>
            </div>
            {preview.matchedTracks.length === 0 ? (
              <div style={styles.noTracksCard}>
                <p style={styles.noTracks}>No tracks matched this filter.</p>
                <p style={{ color: '#383838', fontSize: 12, marginTop: 8 }}>
                  Tips: Try a broader term · Make sure you rescanned after adding the AI key ·
                  For moods, AI classification needs audio features from Spotify
                </p>
              </div>
            ) : (
              <TrackTable
                tracks={preview.matchedTracks}
                onRemove={(id) => handleRemoveTrack(pi, id)}
              />
            )}
          </section>
        ))}

        {/* Action bar */}
        {!done && (
          <div style={styles.actionBar}>
            {creating ? (
              <LoadingSpinner message="Creating playlists…" />
            ) : (
              <button
                style={{
                  ...styles.createBtn,
                  opacity: totalTracks === 0 ? 0.45 : 1,
                  cursor: totalTracks === 0 ? 'not-allowed' : 'pointer',
                }}
                className={totalTracks > 0 ? 'btn-green' : ''}
                onClick={handleCreatePlaylists}
                disabled={totalTracks === 0}
              >
                Create {activePreviews.length > 1 ? `${activePreviews.length} Playlists` : 'Spotify Playlist'}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#121212' },
  main: { maxWidth: 1000, margin: '0 auto', padding: '32px 24px' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 80 },

  backBtn: {
    background: 'transparent',
    border: 'none',
    color: '#535353',
    cursor: 'pointer',
    fontSize: 14,
    padding: '0 0 24px',
    display: 'block',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 28,
  },
  pageTitle: { color: '#fff', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' },
  summaryChips: { display: 'flex', gap: 8 },
  chip: {
    background: '#181818',
    border: '1px solid #282828',
    borderRadius: 20,
    padding: '6px 14px',
    color: '#B3B3B3',
    fontSize: 13,
  },
  chipNum: { color: '#1DB954', fontWeight: 700, marginRight: 4 },

  resultsSection: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 },
  successCard: {
    background: '#0d2a1a',
    border: '1px solid #1DB954',
    borderRadius: 12,
    padding: '18px 22px',
  },
  warningCard: {
    background: '#221a00',
    border: '1px solid #ffb700',
    borderRadius: 12,
    padding: '18px 22px',
  },
  resultTitle: { color: '#1DB954', fontWeight: 700, fontSize: 15, margin: '0 0 8px' },
  warningText: { color: '#ffb700', fontSize: 14, margin: '8px 0' },
  openLink: {
    color: '#1DB954',
    fontSize: 14,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  copyBtn: {
    background: 'transparent',
    border: '1px solid #383838',
    color: '#B3B3B3',
    borderRadius: 20,
    padding: '6px 16px',
    fontSize: 13,
    cursor: 'pointer',
    marginBottom: 10,
    display: 'block',
  },
  quotaNote: { color: '#535353', fontSize: 12, margin: 0 },

  previewSection: { marginBottom: 44 },
  previewHeader: { marginBottom: 14 },
  playlistName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 700,
    margin: '0 0 6px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  playlistNameIcon: { fontSize: 18 },
  previewMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: 0,
    flexWrap: 'wrap',
  },
  metaBadge: {
    background: '#1a2a1a',
    color: '#1DB954',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 12,
    fontWeight: 600,
  },
  trackCount: {
    color: '#1DB954',
    fontWeight: 700,
    fontSize: 13,
  },
  noTracksCard: {
    background: '#181818',
    borderRadius: 8,
    padding: '24px',
    textAlign: 'center',
  },
  noTracks: { color: '#535353', fontStyle: 'italic', margin: 0 },

  actionBar: {
    paddingTop: 20,
    borderTop: '1px solid #1c1c1c',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  createBtn: {
    background: '#1DB954',
    border: 'none',
    color: '#000',
    borderRadius: 32,
    padding: '14px 40px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryBtn: {
    background: 'transparent',
    border: '1px solid #383838',
    color: '#B3B3B3',
    borderRadius: 20,
    padding: '8px 20px',
    fontSize: 14,
    cursor: 'pointer',
  },
};
