import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import spotifyRoutes from './routes/spotify';
import lastfmRoutes from './routes/lastfm';
import classifyRoutes from './routes/classify';
import aiRoutes from './routes/ai';

// Shared Express app. Mounted as a Vercel serverless function in production
// (see ../[...path].ts) and started by a local dev server (see server/src/index.ts).
export function createApp() {
  const app = express();

  // In production the API is served from the same origin as the SPA, so CORS is
  // only needed for local dev, where Vite runs on :5173 and Express on :3001.
  app.use(cors({
    origin: [
      process.env.FRONTEND_URL ?? 'http://localhost:5173',
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

  app.get('/api/debug', (_req, res) => {
    res.json({
      clientIdSet: !!process.env.SPOTIFY_CLIENT_ID,
      clientIdPrefix: process.env.SPOTIFY_CLIENT_ID?.slice(0, 8),
      redirectUri: process.env.SPOTIFY_REDIRECT_URI,
      frontendUrl: process.env.FRONTEND_URL,
    });
  });

  return app;
}

export default createApp;
