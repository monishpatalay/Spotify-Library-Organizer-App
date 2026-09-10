import 'dotenv/config';
import { createApp } from '../../client/api/_lib/app.js';

// Local dev only. In production the same Express app runs as a Vercel
// serverless function at /api/* (see client/api/[...path].ts).
const PORT = process.env.PORT ?? 3001;

createApp().listen(PORT, () => {
  console.log(`\nServer running on http://localhost:${PORT}`);
  console.log('CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID ?? '❌ NOT SET');
  console.log('REDIRECT_URI:', process.env.SPOTIFY_REDIRECT_URI ?? '❌ NOT SET');
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL ?? '❌ NOT SET');
});
