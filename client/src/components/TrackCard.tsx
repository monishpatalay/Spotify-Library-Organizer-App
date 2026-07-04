import React from 'react';
import { Track } from '../types';

interface TrackCardProps { track: Track; onRemove?: () => void; }

const MOOD_COLORS: Record<string, { color: string; bg: string }> = {
  sad:       { color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  happy:     { color: '#facc15', bg: 'rgba(250,204,21,0.12)' },
  party:     { color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  chill:     { color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' },
  energetic: { color: '#fb7185', bg: 'rgba(251,113,133,0.12)' },
  workout:   { color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  romantic:  { color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
};
const DEFAULT_MOOD = { color: '#a855f7', bg: 'rgba(168,85,247,0.12)' };

export default function TrackCard({ track, onRemove }: TrackCardProps) {
  const year = track.releaseDate?.slice(0, 4) ?? '';
  const hasInfo = track.aiLanguage || (track.aiMoods && track.aiMoods.length > 0);

  return (
    <div style={s.card} className="track-card glass">
      {track.albumImage ? (
        <img src={track.albumImage} alt={track.album} style={s.img} loading="lazy" />
      ) : (
        <div style={s.imgPlaceholder}><span style={{ fontSize: 20 }}>🎵</span></div>
      )}
      <div style={s.info}>
        {track.spotifyUrl ? (
          <a href={track.spotifyUrl} target="_blank" rel="noreferrer" style={s.name} className="spotify-link" title={track.name}>
            {track.name}
          </a>
        ) : (
          <p style={s.name} title={track.name}>{track.name}</p>
        )}
        <p style={s.artists}>{track.artists.join(', ')}</p>
        <p style={s.album}>{track.album}{year ? ` · ${year}` : ''}</p>
        {hasInfo && (
          <div style={s.tags}>
            {track.aiLanguage && (
              <span style={{ ...s.tag, color: '#1DB954', background: 'rgba(29,185,84,0.1)', border: '1px solid rgba(29,185,84,0.2)' }}>
                {track.aiLanguage}
              </span>
            )}
            {track.aiMoods?.map((mood) => {
              const mc = MOOD_COLORS[mood] ?? DEFAULT_MOOD;
              return (
                <span key={mood} style={{ ...s.tag, color: mc.color, background: mc.bg, border: `1px solid ${mc.color}30` }}>
                  {mood}
                </span>
              );
            })}
          </div>
        )}
      </div>
      {onRemove && (
        <button style={s.removeBtn} className="remove-btn-inline" onClick={onRemove} title="Remove">✕</button>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: {
    borderRadius: 12, padding: 10,
    display: 'flex', alignItems: 'flex-start', gap: 10, position: 'relative',
  },
  img: { width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 },
  imgPlaceholder: {
    width: 52, height: 52, borderRadius: 8,
    background: 'rgba(255,255,255,0.05)', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1, minWidth: 0 },
  name: {
    display: 'block', color: '#fff', fontSize: 13, fontWeight: 600,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    margin: '0 0 2px', textDecoration: 'none',
  },
  artists: {
    margin: '0 0 2px', color: 'var(--text-dim)', fontSize: 12,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  album: {
    margin: 0, color: 'var(--text-muted)', fontSize: 11,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  tags: { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 },
  tag: {
    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
    letterSpacing: '0.2px', textTransform: 'capitalize',
  },
  removeBtn: {
    background: 'transparent', border: '1px solid transparent',
    color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13,
    padding: '2px 4px', flexShrink: 0, lineHeight: 1, borderRadius: 4,
  },
};
