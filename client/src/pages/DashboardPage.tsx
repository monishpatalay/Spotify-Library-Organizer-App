import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import TrackCard from '../components/TrackCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage'; // used for scan errors
import { useSpotifyAuth } from '../hooks/useSpotifyAuth';
import { useLikedSongs } from '../hooks/useLikedSongs';
import { parseUserPrompt } from '../utils/promptParser';
import { filterSongs, filterByArtistFrequency } from '../utils/filterSongs';
import { aiParsePrompt } from '../utils/aiApi';

const EXAMPLES = [
  'Find me all Telugu songs',
  'Give me all sad songs',
  'Put all party songs into a playlist called Party Mode',
  'Create a playlist of all Arijit Singh songs called Arijit Hits',
  'Give me chill songs',
  'Put songs before 2010 into a playlist called Throwback',
  'Create playlists for artists with more than 5 liked songs',
  'Find me all English songs',
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, profileLoading, error: authError, isAuthenticated, logout, refetch } = useSpotifyAuth();
  const {
    tracks, loading: scanLoading, error: scanError, progress, scanned, scan, rescan,
    moodLoading, moodLoaded, moodError, moodStatus, retryMoodTags, fromCache,
  } = useLikedSongs();
  const [prompt, setPrompt] = useState('');
  const [promptError, setPromptError] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  // Reset banner when a new error comes in
  useEffect(() => { setBannerDismissed(false); }, [authError]);

  const [aiParsing, setAiParsing] = useState(false);

  async function handleGeneratePreview() {
    if (!prompt.trim()) {
      setPromptError('Please enter a prompt.');
      return;
    }
    setPromptError('');

    // Try AI parsing first; fall back to regex parser if unavailable
    setAiParsing(true);
    let parsed = await aiParsePrompt(prompt);
    setAiParsing(false);
    if (!parsed) parsed = parseUserPrompt(prompt);

    if (parsed.filterType === 'artist_frequency') {
      const previews = filterByArtistFrequency(tracks, Number(parsed.filterValue));
      navigate('/preview', { state: { previews, isMulti: true } });
      return;
    }

    const matched = filterSongs(tracks, parsed);
    navigate('/preview', {
      state: {
        preview: {
          playlistName: parsed.playlistName,
          matchedTracks: matched,
          filterType: parsed.filterType,
          filterValue: parsed.filterValue,
        },
        isMulti: false,
      },
    });
  }

  const [recentExpanded, setRecentExpanded] = useState(false);
  const RECENT_PREVIEW = 12;
  const recentTracks = tracks.slice(0, recentExpanded ? tracks.length : RECENT_PREVIEW);
  const scanPct = progress.total > 0 ? Math.min(100, (progress.fetched / progress.total) * 100) : 0;

  return (
    <div style={styles.page}>
      <Navbar user={user} onLogout={logout} />
      <main style={styles.main}>

        {/* Profile error banner — non-blocking */}
        {authError && !bannerDismissed && (
          <div style={styles.errorBanner}>
            <div>
              <span style={{ color: '#ffb700', fontWeight: 600 }}>
                {authError.includes('429') ? '⚠️ Rate limited by Spotify' : '⚠️ Profile unavailable'}
              </span>
              {authError.includes('429') && (
                <span style={{ color: '#888', fontSize: 12 }}> — retrying automatically…</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {!profileLoading && (
                <button style={styles.bannerBtn} onClick={refetch}>Retry</button>
              )}
              <button style={styles.bannerClose} onClick={() => setBannerDismissed(true)}>✕</button>
            </div>
          </div>
        )}

        {/* Greeting — renders immediately, profile fields fill in once loaded */}
        <div style={styles.greeting} className="fade-up">
          {user?.images?.[0]?.url ? (
            <img src={user.images[0].url} alt="avatar" style={styles.bigAvatar} />
          ) : (
            <div style={styles.avatarFallback}>
              {profileLoading ? '…' : (user?.display_name?.[0]?.toUpperCase() ?? '🎧')}
            </div>
          )}
          <div>
            <h1 style={styles.greetingTitle}>
              {user ? `Hey, ${user.display_name?.split(' ')[0]}!` : 'Welcome back!'}
            </h1>
            <p style={styles.greetingSubtitle}>
              {user ? user.email : profileLoading ? 'Loading profile…' : ' '}
            </p>
          </div>
          {scanned && (
            <div style={styles.statChip}>
              <span style={styles.statNum}>{tracks.length.toLocaleString()}</span>
              <span style={styles.statLabel}>liked songs</span>
            </div>
          )}
        </div>

        {/* Scan section */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Your Library</h2>

          {!scanned && !scanLoading && (
            <div style={styles.scanCard}>
              <div style={styles.scanIcon}>🎵</div>
              <p style={styles.scanCardText}>Scan your Spotify library to get started</p>
              <button style={styles.primaryBtn} className="btn-green scan-btn" onClick={scan}>
                Scan Liked Songs
              </button>
            </div>
          )}

          {scanned && !scanLoading && fromCache && (
            <button
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)', borderRadius: 20, padding: '5px 14px', fontSize: 12, cursor: 'pointer', marginTop: 8 }}
              className="expand-btn"
              onClick={rescan}
              title="Re-fetch your liked songs from Spotify"
            >
              ↻ Rescan library
            </button>
          )}

          {scanLoading && (
            <div style={styles.scanProgress}>
              <LoadingSpinner message={`Fetching songs… ${progress.fetched}${progress.total ? ` / ${progress.total}` : ''}`} />
              {progress.total > 0 && (
                <div style={styles.progressWrap}>
                  <div style={styles.progressBar}>
                    <div style={{ ...styles.progressFill, width: `${scanPct}%` }} />
                  </div>
                  <span style={styles.progressPct}>{Math.round(scanPct)}%</span>
                </div>
              )}
            </div>
          )}

          {scanError && <ErrorMessage message={scanError} onRetry={scan} />}

          {scanned && (
            <div>
              <p style={styles.scanResult}>
                ✅ Loaded <strong style={{ color: '#1DB954' }}>{tracks.length.toLocaleString()}</strong> liked songs
              </p>
              {moodLoading && (
                <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>
                  {moodStatus || 'Loading mood & AI classification…'}
                </p>
              )}
              {moodLoaded && !moodLoading && (
                <p style={{ color: '#1DB954', fontSize: 13, marginTop: 4 }}>
                  ✦ Mood & language filters ready
                </p>
              )}
              {moodError && !moodLoading && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <p style={{ color: '#fbbf24', fontSize: 13, margin: 0 }}>
                    ⚠️ {moodError}
                  </p>
                  <button
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-dim)', borderRadius: 12, padding: '3px 12px', fontSize: 12, cursor: 'pointer' }}
                    className="expand-btn"
                    onClick={retryMoodTags}
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Recent tracks grid */}
        {scanned && tracks.length > 0 && (
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>
                Recent Likes
                <span style={styles.recentCount}>{recentExpanded ? tracks.length : Math.min(RECENT_PREVIEW, tracks.length)} / {tracks.length}</span>
              </h2>
              {tracks.length > RECENT_PREVIEW && (
                <button
                  style={styles.expandBtn}
                  onClick={() => setRecentExpanded((v) => !v)}
                  title={recentExpanded ? 'Show less' : 'Show all'}
                >
                  <span style={{
                    display: 'inline-block',
                    transition: 'transform 0.2s',
                    transform: recentExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    fontSize: 18,
                    lineHeight: 1,
                  }}>›</span>
                  <span style={{ fontSize: 12, marginLeft: 4 }}>
                    {recentExpanded ? 'Show less' : `Show all ${tracks.length}`}
                  </span>
                </button>
              )}
            </div>
            <div style={styles.trackGrid}>
              {recentTracks.map((t) => (
                <TrackCard key={t.id} track={t} />
              ))}
            </div>
          </section>
        )}

        {/* Prompt section */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Generate a Playlist</h2>

          {/* Example pills */}
          <div style={styles.pillsRow}>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                style={styles.pill}
                className="example-pill"
                onClick={() => setPrompt(ex)}
              >
                {ex}
              </button>
            ))}
          </div>

          <div style={styles.inputWrap}>
            <textarea
              style={styles.promptInput}
              className="prompt-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the playlist you want…"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGeneratePreview();
                }
              }}
            />
            <p style={styles.inputHint}>Press Enter to generate · Shift+Enter for new line</p>
          </div>

          {promptError && <p style={styles.promptError}>{promptError}</p>}

          <button
            style={{
              ...styles.primaryBtn,
              opacity: (!scanned || aiParsing) ? 0.65 : 1,
              cursor: (!scanned || aiParsing) ? 'not-allowed' : 'pointer',
            }}
            className={scanned && !aiParsing ? 'btn-green' : ''}
            onClick={handleGeneratePreview}
            disabled={!scanned || aiParsing}
          >
            {aiParsing ? '🤖 Understanding your request…' : 'Generate Playlist Preview →'}
          </button>
          {!scanned && (
            <p style={styles.disabledNote}>Scan your liked songs first to generate playlists.</p>
          )}
        </section>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--bg)' },
  main: { maxWidth: 960, margin: '0 auto', padding: '36px 24px' },

  greeting: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 40,
    flexWrap: 'wrap',
  },
  bigAvatar: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid rgba(168,85,247,0.5)',
    boxShadow: '0 0 16px rgba(168,85,247,0.25)',
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #a855f7, #1DB954)',
    color: '#fff',
    fontSize: 24,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  greetingTitle: { color: '#fff', fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: '-0.8px' },
  greetingSubtitle: { color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' },
  statChip: {
    marginLeft: 'auto',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 14,
    padding: '10px 20px',
    textAlign: 'center',
  },
  statNum: { display: 'block', color: '#1DB954', fontSize: 24, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.5px' },
  statLabel: { display: 'block', color: 'var(--text-muted)', fontSize: 11, marginTop: 4, letterSpacing: '0.3px' },

  section: { marginBottom: 48 },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
    letterSpacing: '-0.3px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  recentCount: {
    color: 'var(--text-muted)',
    fontSize: 13,
    fontWeight: 400,
  },
  expandBtn: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-dim)',
    borderRadius: 20,
    padding: '5px 14px',
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },

  scanCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px dashed rgba(168,85,247,0.25)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 16,
    padding: '44px 24px',
    textAlign: 'center',
  },
  scanIcon: { fontSize: 36, marginBottom: 14 },
  scanCardText: { color: 'var(--text-dim)', fontSize: 14, margin: '0 0 20px' },

  scanProgress: { padding: '8px 0' },
  progressWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    maxWidth: 400,
    margin: '8px auto 0',
  },
  progressBar: {
    flex: 1,
    height: 4,
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #a855f7, #1DB954, #22d3ee)',
    transition: 'width 0.3s',
    borderRadius: 2,
  },
  progressPct: { color: 'var(--text-muted)', fontSize: 12, minWidth: 36 },

  scanResult: { color: 'var(--text)', fontSize: 15, marginTop: 12 },

  trackGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 8,
  },

  pillsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  pill: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: 'var(--text-dim)',
    borderRadius: 20,
    padding: '6px 14px',
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },

  inputWrap: { position: 'relative', marginBottom: 8 },
  promptInput: {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: '#fff',
    fontSize: 15,
    padding: '14px 16px',
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  inputHint: { color: 'var(--text-muted)', fontSize: 11, margin: '6px 0 0', textAlign: 'right' },

  primaryBtn: {
    background: 'linear-gradient(135deg, #1DB954 0%, #22d3ee 100%)',
    border: 'none',
    color: '#000',
    borderRadius: 32,
    padding: '12px 28px',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
  promptError: { color: '#f87171', fontSize: 13, marginBottom: 12 },
  disabledNote: { color: 'var(--text-muted)', fontSize: 13, marginTop: 10 },

  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    background: 'rgba(255,183,0,0.06)',
    border: '1px solid rgba(255,183,0,0.18)',
    borderRadius: 12,
    padding: '10px 16px',
    marginBottom: 24,
    fontSize: 13,
  },
  bannerBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--text-dim)',
    borderRadius: 12,
    padding: '3px 12px',
    fontSize: 12,
    cursor: 'pointer',
  },
  bannerClose: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 14,
    cursor: 'pointer',
    padding: '2px 4px',
  },
};
