import React from 'react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div style={styles.wrapper}>
      <span style={styles.icon}>⚠️</span>
      <p style={styles.text}>{message}</p>
      {onRetry && (
        <button style={styles.retryBtn} onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    background: '#2a1a1a',
    border: '1px solid #5a2020',
    borderRadius: 8,
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  icon: { fontSize: 18 },
  text: {
    margin: 0,
    color: '#ff6b6b',
    fontSize: 14,
    flex: 1,
  },
  retryBtn: {
    background: '#1DB954',
    border: 'none',
    color: '#000',
    borderRadius: 20,
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
