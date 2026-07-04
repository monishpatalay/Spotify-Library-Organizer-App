import React from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

const FEATURES = [
  { icon: '⚡', title: 'Instant Scan', desc: 'Fetch every liked song in seconds — no matter how massive your library.', color: '#22d3ee' },
  { icon: '🤖', title: 'AI Powered', desc: 'Just type "sad Telugu songs after 2015" and the AI figures out the rest.', color: '#a855f7' },
  { icon: '🎨', title: 'Multi-Mood Tags', desc: 'Songs get multiple vibes: romantic + sad, party + energetic — all at once.', color: '#ec4899' },
  { icon: '📂', title: 'Real Playlists', desc: 'One click creates an actual Spotify playlist in your account.', color: '#1DB954' },
];

const SpotifyIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.65 14.42c-.2.31-.6.41-.92.21-2.52-1.54-5.69-1.89-9.42-1.04-.36.08-.72-.14-.8-.5-.08-.36.14-.72.5-.8 4.08-.93 7.59-.53 10.42 1.21.32.2.42.6.22.92zm1.24-2.76c-.25.38-.76.5-1.14.25-2.88-1.77-7.27-2.28-10.68-1.25-.42.13-.87-.1-1-.52-.13-.42.1-.87.52-1C9.24 9.9 14.1 10.47 17.4 12.5c.38.25.5.76.25 1.14l.24.02zm.11-2.87C14.74 9 8.82 8.8 5.53 9.77c-.5.15-1.03-.14-1.18-.64-.15-.5.14-1.03.64-1.18C8.48 6.83 15 7.06 18.57 9.33c.45.27.6.86.33 1.31-.27.46-.86.6-1.31.33l-.59-.18z"/>
  </svg>
);

const MOOD_PILLS = [
  { label: 'romantic', color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  { label: 'sad', color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  { label: 'party', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  { label: 'chill', color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
  { label: 'energetic', color: '#fb7185', bg: 'rgba(251,113,133,0.12)' },
  { label: 'happy', color: '#facc15', bg: 'rgba(250,204,21,0.12)' },
  { label: 'workout', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
];

export default function LandingPage() {
  const urlError = new URLSearchParams(window.location.search).get('error');

  return (
    <div style={s.page}>
      {/* Animated background orbs */}
      <div style={{ ...s.orb, width: 520, height: 520, top: -120, left: -160, background: 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)', animationDelay: '0s' }} />
      <div style={{ ...s.orb, width: 420, height: 420, top: '35%', right: -130, background: 'radial-gradient(circle, rgba(29,185,84,0.15) 0%, transparent 70%)', animationDelay: '-3s' }} />
      <div style={{ ...s.orb, width: 360, height: 360, bottom: -90, left: '28%', background: 'radial-gradient(circle, rgba(34,211,238,0.13) 0%, transparent 70%)', animationDelay: '-6s' }} />

      <div style={s.grid} aria-hidden="true" />

      <div style={s.content} className="fade-up">

        {/* Logo badge */}
        <div style={s.logoBadge}>
          <div style={{ color: '#1DB954', display: 'flex', alignItems: 'center' }}><SpotifyIcon /></div>
          <span style={s.logoText}>Spotify Organizer</span>
          <span style={s.aiBadge}>✦ AI</span>
        </div>

        {/* Hero */}
        <h1 style={s.headline}>
          Your music,
          <br />
          <span className="grad-text">organized by vibes</span>
        </h1>
        <p style={s.sub}>
          AI reads every song you've ever liked and turns them into perfect mood playlists — instantly.
        </p>

        {/* Feature grid */}
        <div style={s.features}>
          {FEATURES.map((f) => (
            <div key={f.title} style={s.featureCard} className="feature-card glass">
              <span style={{ fontSize: 22, display: 'block', marginBottom: 10, color: f.color }}>{f.icon}</span>
              <strong style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6, color: f.color }}>{f.title}</strong>
              <p style={{ color: 'var(--text-dim)', fontSize: 12, margin: 0, lineHeight: 1.55 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <button style={s.connectBtn} className="btn-green scan-btn" onClick={() => { window.location.href = `${API_BASE}/api/auth/login`; }}>
          <SpotifyIcon size={20} />
          Connect with Spotify
        </button>

        {urlError && (
          <div style={s.errorBox}>
            <p style={{ color: '#f87171', fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>⚠️ Authentication failed</p>
            <p style={{ color: '#ef4444', fontSize: 12, margin: 0, wordBreak: 'break-all', lineHeight: 1.5 }}>{decodeURIComponent(urlError)}</p>
          </div>
        )}

        <p style={s.disclaimer}>Read-only access · We never modify or delete your data</p>

        {/* Mood pills preview */}
        <div style={s.moodRow}>
          {MOOD_PILLS.map((m) => (
            <span key={m.label} style={{ ...s.moodPill, color: m.color, background: m.bg, border: `1px solid ${m.color}30` }}>
              {m.label}
            </span>
          ))}
        </div>

      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    position: 'relative',
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(70px)',
    animation: 'orb 12s ease-in-out infinite',
    pointerEvents: 'none',
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(rgba(168,85,247,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(168,85,247,0.04) 1px,transparent 1px)',
    backgroundSize: '48px 48px',
    pointerEvents: 'none',
  },
  content: { maxWidth: 620, width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 },
  logoBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 32, padding: '7px 18px 7px 12px', marginBottom: 36,
  },
  logoText: { color: '#e0e0f0', fontWeight: 700, fontSize: 15, letterSpacing: '-0.2px' },
  aiBadge: { color: '#a855f7', fontWeight: 700, fontSize: 12, letterSpacing: '0.5px' },
  headline: {
    color: '#fff', fontSize: 'clamp(36px, 7vw, 60px)', fontWeight: 900,
    margin: '0 0 20px', lineHeight: 1.08, letterSpacing: '-2.5px',
  },
  sub: {
    color: 'var(--text-dim)', fontSize: 17, margin: '0 auto 44px', lineHeight: 1.65,
    maxWidth: 460,
  },
  features: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12,
    marginBottom: 40, textAlign: 'left',
  },
  featureCard: { borderRadius: 16, padding: '20px 18px' },
  connectBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 10,
    border: 'none', borderRadius: 32, padding: '15px 42px',
    fontSize: 16, fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.2px',
  },
  errorBox: {
    marginTop: 16, background: 'rgba(248,113,113,0.07)',
    border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12, padding: '12px 16px', textAlign: 'left',
  },
  disclaimer: { color: 'var(--text-muted)', fontSize: 12, marginTop: 20 },
  moodRow: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 28 },
  moodPill: {
    fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 32,
    letterSpacing: '0.3px', textTransform: 'capitalize',
  },
};
