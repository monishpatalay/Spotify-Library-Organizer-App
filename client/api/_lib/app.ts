import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import spotifyRoutes from './routes/spotify.js';
import lastfmRoutes from './routes/lastfm.js';
import classifyRoutes from './routes/classify.js';
import aiRoutes from './routes/ai.js';

// Shared Express app. Mounted as a Vercel serverless function in production
// (see ../[...path].ts) and started by a local dev server (see server/src/index.ts).
export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  // In production the API is served from the same origin as the SPA, so CORS is
  // only needed for local dev, where Vite runs on :5173 and Express on :3001.
  app.use(cors({
    origin: [
      process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
    exposedHeaders: ['Retry-After'],
  }));
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/spotify', spotifyRoutes);
  app.use('/api/lastfm', lastfmRoutes);
  app.use('/api/classify', classifyRoutes);
  app.use('/api/ai', aiRoutes);

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  // Last stop for errors from routes (see utils/asyncRoute.ts) and body parsing.
  // Keeps body-parser's 4xx statuses and never sends internal details to the client.
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) { next(err); return; }
    const status = Number(err?.status ?? err?.statusCode) || 500;
    if (status >= 500) console.error('Unhandled route error:', err);
    res.status(status).json({ error: err?.expose ? err.message : 'Internal server error' });
  });

  return app;
}

export default createApp;
