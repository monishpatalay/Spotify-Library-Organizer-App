import React from 'react';
import { Track } from '../types';

interface TrackTableProps {
  tracks: Track[];
  onRemove?: (id: string) => void;
}

export default function TrackTable({ tracks, onRemove }: TrackTableProps) {
  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.th, width: 40, textAlign: 'right' }}>#</th>
            <th style={styles.th}>Title</th>
            <th style={styles.th}>Artist(s)</th>
            <th style={styles.th}>Album</th>
            <th style={{ ...styles.th, width: 60 }}>Year</th>
            {onRemove && <th style={{ ...styles.th, width: 40 }} />}
          </tr>
        </thead>
        <tbody>
          {tracks.map((t, i) => (
            <tr key={t.id} style={styles.row} className="track-row">
              <td style={{ ...styles.td, textAlign: 'right', color: '#535353', fontSize: 12 }}>
                <span className="row-num">{i + 1}</span>
              </td>
              <td style={styles.td}>
                <div style={styles.titleCell}>
                  {t.albumImage && (
                    <img src={t.albumImage} alt="" style={styles.thumb} loading="lazy" />
                  )}
                  <div style={styles.titleInfo}>
                    {t.spotifyUrl ? (
                      <a href={t.spotifyUrl} target="_blank" rel="noreferrer" style={styles.trackNameLink} className="spotify-link" title={t.name}>
                        {t.name}
                      </a>
                    ) : (
                      <span style={styles.trackName}>{t.name}</span>
                    )}
                  </div>
                </div>
              </td>
              <td style={{ ...styles.td, color: '#B3B3B3' }}>{t.artists.join(', ')}</td>
              <td style={{ ...styles.td, color: '#535353' }}>{t.album}</td>
              <td style={{ ...styles.td, color: '#535353' }}>{t.releaseDate?.slice(0, 4)}</td>
              {onRemove && (
                <td style={{ ...styles.td, padding: '8px 8px 8px 0' }}>
                  <button
                    style={styles.removeBtn}
                    className="remove-btn-inline"
                    onClick={() => onRemove(t.id)}
                    title="Remove from playlist"
                  >
                    ✕
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    overflowX: 'auto',
    borderRadius: 8,
    border: '1px solid #1a1a1a',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
    color: '#fff',
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    color: '#535353',
    fontWeight: 500,
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    borderBottom: '1px solid #1c1c1c',
    background: '#141414',
    whiteSpace: 'nowrap',
  },
  row: {
    borderBottom: '1px solid #161616',
  },
  td: {
    padding: '9px 12px',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    maxWidth: 220,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  titleCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  titleInfo: {
    minWidth: 0,
    overflow: 'hidden',
  },
  thumb: {
    width: 32,
    height: 32,
    borderRadius: 3,
    objectFit: 'cover',
    flexShrink: 0,
  },
  trackNameLink: {
    color: '#fff',
    textDecoration: 'none',
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 220,
    fontWeight: 500,
  },
  trackName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 220,
    display: 'block',
    fontWeight: 500,
  },
  removeBtn: {
    background: 'transparent',
    border: '1px solid transparent',
    color: '#535353',
    borderRadius: 4,
    padding: '3px 7px',
    fontSize: 12,
    cursor: 'pointer',
  },
};
