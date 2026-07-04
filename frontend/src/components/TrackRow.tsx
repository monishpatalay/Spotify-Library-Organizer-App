import React from 'react';
import { Track } from '../types';

export function TrackRow({ track, index }: { track: Track; index: number }) {
  return (
    <div className="track-row">
      <span className="track-num">{index + 1}</span>
      <img
        src={track.albumImage || '/placeholder.png'}
        alt={track.album}
        className="track-img"
        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40'; }}
      />
      <div className="track-info">
        <a href={track.spotifyUrl} target="_blank" rel="noopener noreferrer" className="track-name">
          {track.name}
        </a>
        <span className="track-artist">{track.artists.map((a) => a.name).join(', ')}</span>
      </div>
      <div className="track-meta">
        <span className="track-album">{track.album}</span>
        <span className="track-year">{track.releaseDate?.slice(0, 4)}</span>
      </div>
    </div>
  );
}
