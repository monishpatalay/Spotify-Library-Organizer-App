import React from 'react';
import { SpotifyUser } from '../types';

interface NavbarProps {
  user?: SpotifyUser | null;
  onLogout?: () => void;
}

const SpotifyIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#1DB954">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.65 14.42c-.2.31-.6.41-.92.21-2.52-1.54-5.69-1.89-9.42-1.04-.36.08-.72-.14-.8-.5-.08-.36.14-.72.5-.8 4.08-.93 7.59-.53 10.42 1.21.32.2.42.6.22.92zm1.24-2.76c-.25.38-.76.5-1.14.25-2.88-1.77-7.27-2.28-10.68-1.25-.42.13-.87-.1-1-.52-.13-.42.1-.87.52-1C9.24 9.9 14.1 10.47 17.4 12.5c.38.25.5.76.25 1.14l.24.02zm.11-2.87C14.74 9 8.82 8.8 5.53 9.77c-.5.15-1.03-.14-1.18-.64-.15-.5.14-1.03.64-1.18C8.48 6.83 15 7.06 18.57 9.33c.45.27.6.86.33 1.31-.27.46-.86.6-1.31.33l-.59-.18z"/>
  </svg>
);

export default function Navbar({ user, onLogout }: NavbarProps) {
  return (
    <nav style={s.nav}>
      <div style={s.gradLine} />
      <div style={s.logoWrap}>
        <SpotifyIcon />
        <span style={s.logoText}>Spotify Organizer</span>
        <span style={s.aiBadge}>AI</span>
      </div>
      {user && (
        <div style={s.right}>
          <div style={s.avatarRing}>
            {user.images?.[0]?.url ? (
              <img src={user.images[0].url} alt="avatar" style={s.avatar} />
            ) : (
              <div style={s.avatarFallback}>{user.display_name?.[0]?.toUpperCase() ?? '?'}</div>
            )}
          </div>
          <span style={s.userName}>{user.display_name}</span>
          <button style={s.logoutBtn} className="nav-logout btn-outline" onClick={onLogout}>Log out</button>
        </div>
      )}
    </nav>
  );
}

const s: Record<string, React.CSSProperties> = {
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 28px', height: 60,
    background: 'rgba(8,8,16,0.88)',
    backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    position: 'sticky', top: 0, zIndex: 100,
  },
  gradLine: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.5) 30%, rgba(29,185,84,0.5) 70%, transparent)',
    pointerEvents: 'none',
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 9, position: 'relative', zIndex: 1 },
  logoText: { color: '#fff', fontWeight: 800, fontSize: 16, letterSpacing: '-0.4px' },
  aiBadge: {
    fontSize: 10, fontWeight: 800, letterSpacing: '0.8px',
    background: 'linear-gradient(135deg, #a855f7, #22d3ee)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  },
  right: { display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 },
  avatarRing: { padding: 2, borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #1DB954)', flexShrink: 0 },
  avatar: { width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', display: 'block' },
  avatarFallback: {
    width: 28, height: 28, borderRadius: '50%', background: '#1DB954', color: '#000',
    fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  userName: { color: 'var(--text-dim)', fontSize: 14, fontWeight: 500 },
  logoutBtn: {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--text-dim)', borderRadius: 20, padding: '5px 16px', fontSize: 13, cursor: 'pointer',
  },
};
