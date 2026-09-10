import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from './_lib/app';

// Catch-all Vercel serverless function: this file maps to /api/*, so every
// request under /api reaches the Express app with its original URL intact.
// The app is created once per warm container, not per request.
const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as unknown as (q: IncomingMessage, s: ServerResponse) => void)(req, res);
}
