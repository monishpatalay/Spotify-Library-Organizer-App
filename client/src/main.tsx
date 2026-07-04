import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  :root {
    --green: #1DB954;
    --green-bright: #1ed760;
    --purple: #a855f7;
    --cyan: #22d3ee;
    --pink: #ec4899;
    --bg: #080810;
    --bg2: #0d0d1a;
    --glass: rgba(255,255,255,0.04);
    --glass-border: rgba(255,255,255,0.08);
    --grad-main: linear-gradient(135deg, #a855f7 0%, #1DB954 60%, #22d3ee 100%);
    --grad-btn: linear-gradient(135deg, #1DB954 0%, #22d3ee 100%);
    --grad-card: linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(29,185,84,0.06) 100%);
    --text: #f0f0f8;
    --text-dim: #9090b0;
    --text-muted: #44445a;
  }

  body {
    margin: 0;
    background: var(--bg);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
    color: var(--text);
  }
  a { text-decoration: none; }
  button { font-family: inherit; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes orb {
    0%,100% { transform: translate(0,0) scale(1); opacity: 0.45; }
    33%     { transform: translate(40px,-30px) scale(1.12); opacity: 0.65; }
    66%     { transform: translate(-25px,15px) scale(0.92); opacity: 0.35; }
  }
  @keyframes glowPulse {
    0%,100% { box-shadow: 0 0 20px rgba(29,185,84,0.35), 0 0 40px rgba(168,85,247,0.1); }
    50%     { box-shadow: 0 0 35px rgba(29,185,84,0.55), 0 0 70px rgba(168,85,247,0.3); }
  }
  @keyframes gradShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.3); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(168,85,247,0.6); }

  .grad-text {
    background: var(--grad-main);
    background-size: 200% 200%;
    animation: gradShift 6s ease infinite;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .glass {
    background: var(--glass);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
  }

  .btn-green {
    background: var(--grad-btn) !important;
    color: #000 !important;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }
  .btn-green::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
    opacity: 0;
    transition: opacity 0.2s;
  }
  .btn-green:hover { transform: scale(1.03) !important; box-shadow: 0 8px 32px rgba(29,185,84,0.45), 0 4px 16px rgba(34,211,238,0.25) !important; }
  .btn-green:hover::after { opacity: 1; }
  .btn-green:active { transform: scale(0.97) !important; }

  .btn-outline { transition: all 0.2s; }
  .btn-outline:hover { border-color: rgba(168,85,247,0.6) !important; color: #d8b4fe !important; box-shadow: 0 0 12px rgba(168,85,247,0.2) !important; }

  .track-card {
    transition: all 0.2s ease;
    cursor: default;
    position: relative;
    overflow: hidden;
  }
  .track-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--grad-card);
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
    border-radius: inherit;
  }
  .track-card:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,0,0,0.5), 0 0 0 1px rgba(168,85,247,0.25) !important; }
  .track-card:hover::before { opacity: 1; }

  .track-row { transition: background 0.15s; }
  .track-row:hover { background: rgba(168,85,247,0.06) !important; }
  .track-row:hover .row-num { opacity: 0; }
  .track-row .row-num { transition: opacity 0.1s; }

  .remove-btn-inline { transition: all 0.15s; }
  .remove-btn-inline:hover { color: #f87171 !important; border-color: rgba(248,113,113,0.4) !important; }

  .example-pill { transition: all 0.2s ease; }
  .example-pill:hover { background: rgba(168,85,247,0.12) !important; color: #d8b4fe !important; border-color: rgba(168,85,247,0.35) !important; transform: translateY(-1px); }

  .prompt-textarea:focus { border-color: rgba(168,85,247,0.5) !important; outline: none; box-shadow: 0 0 0 3px rgba(168,85,247,0.1) !important; }

  .nav-logout { transition: all 0.2s; }
  .nav-logout:hover { border-color: rgba(168,85,247,0.5) !important; color: #d8b4fe !important; }

  .back-btn { transition: color 0.15s; }
  .back-btn:hover { color: var(--purple) !important; }

  .spotify-link { transition: color 0.15s; }
  .spotify-link:hover { color: var(--green-bright) !important; text-decoration: underline; }

  .scan-btn { animation: glowPulse 2.5s ease infinite; }
  .scan-btn:hover { animation: none !important; }

  .feature-card { transition: all 0.25s ease; }
  .feature-card:hover { border-color: rgba(168,85,247,0.4) !important; transform: translateY(-4px); box-shadow: 0 16px 36px rgba(0,0,0,0.35), 0 0 24px rgba(168,85,247,0.12) !important; }

  .fade-up { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }

  .expand-btn { transition: all 0.2s ease; }
  .expand-btn:hover { background: rgba(168,85,247,0.1) !important; border-color: rgba(168,85,247,0.4) !important; color: #d8b4fe !important; }
`;

const styleEl = document.createElement('style');
styleEl.textContent = globalStyles;
document.head.appendChild(styleEl);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
