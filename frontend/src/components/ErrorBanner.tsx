import React from 'react';

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="error-banner">
      <span>⚠ {message}</span>
      {onDismiss && (
        <button className="dismiss-btn" onClick={onDismiss}>✕</button>
      )}
    </div>
  );
}
