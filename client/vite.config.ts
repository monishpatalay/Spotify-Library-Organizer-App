import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vercel from './vercel.json';

// `vite preview` serves the production security headers from vercel.json, so the
// E2E tests run under the real Content-Security-Policy.
const productionHeaders = Object.fromEntries(
  vercel.headers.find((h) => h.source === '/(.*)')!.headers.map((h) => [h.key, h.value]),
);

export default defineConfig({
  plugins: [react()],
  preview: { headers: productionHeaders },
  server: {
    // 127.0.0.1, not localhost: the OAuth callback (and its cookies) come back on 127.0.0.1.
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
});
