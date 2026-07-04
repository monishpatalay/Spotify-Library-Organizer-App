import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import spotifyRoutes from './routes/spotify';
import lastfmRoutes from './routes/lastfm';
import classifyRoutes from './routes/classify';
import aiRoutes from './routes/ai';

const app = express();
const PORT = process.env.PORT ?? 3001;

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

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/debug', (_req, res) => {
  res.json({
    clientIdSet: !!process.env.SPOTIFY_CLIENT_ID,
    clientIdPrefix: process.env.SPOTIFY_CLIENT_ID?.slice(0, 8),
    redirectUri: process.env.SPOTIFY_REDIRECT_URI,
    frontendUrl: process.env.FRONTEND_URL,
  });
});

app.listen(PORT, () => {
  console.log(`\nServer running on http://localhost:${PORT}`);
  console.log('CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID ?? '❌ NOT SET');
  console.log('REDIRECT_URI:', process.env.SPOTIFY_REDIRECT_URI ?? '❌ NOT SET');
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL ?? '❌ NOT SET');
});
