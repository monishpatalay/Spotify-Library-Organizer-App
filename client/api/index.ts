import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from './_lib/app.js';

// The Express app is created once per warm container, not per request.
const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  // Vercel's catch-all file routing ([...path].ts) only matched a single path
  // segment for this project, so /api/auth/login 404'd before reaching the
  // function. vercel.json instead rewrites every /api/* request here with the
  // real path in __p; restore it so Express sees the URL it mounts on.
  const url = new URL(req.url ?? '/api', 'http://localhost');
  const path = url.searchParams.get('__p');

  if (path !== null) {
    url.searchParams.delete('__p');
    const query = url.searchParams.toString();
    req.url = `/api/${path}${query ? `?${query}` : ''}`;
  }

  return (app as unknown as (q: IncomingMessage, s: ServerResponse) => void)(req, res);
}
