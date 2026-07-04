import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.spinner} />
      {message && <p style={styles.message}>{message}</p>}
    </div>
  );
}

const keyframes = `
@keyframes spin {
  to { transform: rotate(360deg); }
}
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = keyframes;
  document.head.appendChild(style);
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 40,
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #282828',
    borderTop: '3px solid #1DB954',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  message: {
    color: '#B3B3B3',
    margin: 0,
    fontSize: 14,
  },
};
