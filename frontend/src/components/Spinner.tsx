import React from 'react';

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `3px solid rgba(29, 185, 84, 0.2)`,
        borderTop: `3px solid #1DB954`,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        display: 'inline-block',
      }}
    />
  );
}
