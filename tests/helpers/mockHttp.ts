// Test helpers: replace every outbound HTTP call (global fetch + axios) with a
// handler, and start the real Express app on a random local port.
import fs from 'fs';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach } from 'node:test';
import type { Server } from 'node:http';
import axios from '../../client/node_modules/axios';

export interface MockResponse { status: number; body?: unknown; headers?: Record<string, string> }
export interface Call { url: string; method: string; body: unknown; auth?: string }
export type Handler = (call: Call) => MockResponse | Error | undefined | Promise<MockResponse | Error | undefined>;

const realFetch = globalThis.fetch;
const realAdapter = axios.defaults.adapter;

function parseBody(body: unknown) {
  if (typeof body !== 'string') return body;
  try { return JSON.parse(body); } catch { return body; }
}

// Requests to 127.0.0.1 (the app under test) pass through untouched.
export function mockHttp(handler: Handler) {
  const calls: Call[] = [];

  globalThis.fetch = (async (input: any, init: any = {}) => {
    const url = String(input?.url ?? input);
    if (url.startsWith('http://127.0.0.1')) return realFetch(input, init);
    const headers = new Headers(init.headers);
    const call = { url, method: init.method ?? 'GET', body: parseBody(init.body), auth: headers.get('authorization') ?? undefined };
    calls.push(call);
    const r = await handler(call);
    if (!r || r instanceof Error) throw r ?? new TypeError(`fetch failed (unmocked ${url})`);
    const text = typeof r.body === 'string' ? r.body : JSON.stringify(r.body ?? {});
    return new Response(text, { status: r.status, headers: r.headers });
  }) as typeof fetch;

  axios.defaults.adapter = async (config: any) => {
    const url = axios.getUri(config);
    const call = { url, method: String(config.method).toUpperCase(), body: parseBody(config.data), auth: config.headers?.Authorization };
    calls.push(call);
    const r = await handler(call);
    if (!r || r instanceof Error) throw new axios.AxiosError(r?.message ?? `unmocked ${url}`, 'ECONNREFUSED', config);
    const response = { data: r.body, status: r.status, statusText: String(r.status), headers: r.headers ?? {}, config, request: {} };
    if (r.status >= 400) {
      throw new axios.AxiosError(`Request failed with status code ${r.status}`, 'ERR_BAD_RESPONSE', config, {}, response as any);
    }
    return response as any;
  };

  return {
    calls,
    restore() {
      globalThis.fetch = realFetch;
      axios.defaults.adapter = realAdapter;
    },
  };
}

// Spotify /v1/me stub: "Bearer user:<id>" is a valid token for <id>, anything else is 401.
export function spotifyMe(call: Call): MockResponse | undefined {
  if (!call.url.startsWith('https://api.spotify.com/v1/me') || call.url.includes('/me/')) return undefined;
  const id = call.auth?.match(/^Bearer user:(.+)$/)?.[1];
  return id ? { status: 200, body: { id, email: `${id}@example.com` } } : { status: 401, body: { error: 'invalid token' } };
}

export function geminiText(text: string): MockResponse {
  return { status: 200, body: { candidates: [{ content: { parts: [{ text }] } }] } };
}

// ai.ts persists its cache to server/data/ai_cache.json (periodically and on exit).
// Tests must never touch that file: swallow writes to it and drop its exit handlers.
const realWriteFileSync = fs.writeFileSync;
(fs as any).writeFileSync = (file: any, ...rest: any[]) => {
  if (String(file).endsWith('ai_cache.json')) return;
  return (realWriteFileSync as any)(file, ...rest);
};

function withoutNewExitHandlers<T>(load: () => T): T {
  const before = new Set([...process.listeners('exit'), ...process.listeners('SIGINT')]);
  const result = load();
  for (const ev of ['exit', 'SIGINT'] as const) {
    for (const l of process.listeners(ev)) if (!before.has(l)) process.removeListener(ev, l as any);
  }
  return result;
}

export const TEST_ENV = {
  SPOTIFY_CLIENT_ID: 'test-client-id',
  SPOTIFY_CLIENT_SECRET: 'test-client-secret',
  SPOTIFY_REDIRECT_URI: 'http://127.0.0.1:3001/api/auth/callback',
  FRONTEND_URL: 'http://localhost:5173',
  GEMINI_API_KEY: 'test-gemini-key',
  LASTFM_API_KEY: 'test-lastfm-key',
  SESSION_SECRET: 'test-session-secret-0123456789abcdef',
};

export const isGemini = (c: Call) => c.url.includes('generativelanguage.googleapis.com');
// Rows of a classify prompt: each line after the header is "id|name|artist|album|tags".
export const promptLines = (c: Call): string[] => (c.body as any).contents[0].parts[0].text.split('\n').slice(1);
export const classifyAll = (moods: string[]) => (c: Call) => isGemini(c)
  ? geminiText(JSON.stringify(Object.fromEntries(promptLines(c).map((l) => [l.split('|')[0], { moods, language: 'english' }]))))
  : undefined;
export const newUser = () => `user:${randomUUID()}`;
export const statusOf = (p: Promise<Response>) => p.then((r) => r.status, (e) => `no response (${e.name})`);

// Registers node:test hooks that start the app with all outbound HTTP mocked.
// Unhandled rejections (a crashed async route) are recorded instead of killing the run.
export function useTestApp() {
  Object.assign(process.env, TEST_ENV);
  const ctx = {
    app: undefined as unknown as Awaited<ReturnType<typeof startApp>>,
    handler: (() => undefined) as Handler,
    unhandled: [] as unknown[],
    calls: [] as Call[],
  };
  const http = mockHttp((c) => spotifyMe(c) ?? ctx.handler(c));
  ctx.calls = http.calls;
  process.on('unhandledRejection', (e) => { ctx.unhandled.push(e); });
  before(async () => { ctx.app = await startApp(); });
  after(async () => { await ctx.app.close(); http.restore(); });
  beforeEach(() => { ctx.handler = () => undefined; http.calls.length = 0; ctx.unhandled.length = 0; });
  return ctx;
}

export async function startApp() {
  const { createApp } = withoutNewExitHandlers(() => require('../../client/api/_lib/app.ts'));
  const server: Server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  // A "user:<id>" token stands for someone who logged in through the app: send it
  // as the Bearer token plus the signed session cookie the callback would have set.
  const { signSession } = require('../../client/api/_lib/utils/session.ts');
  const auth = (token?: string): Record<string, string> => ({
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(token?.startsWith('user:') ? { Cookie: `sp_session=${signSession(token.slice(5))}` } : {}),
  });
  return {
    base,
    close: () => new Promise<void>((r) => server.close(() => r())),
    post: (path: string, body: unknown, token?: string) => realFetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth(token) },
      body: typeof body === 'string' ? body : JSON.stringify(body),
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    }),
    get: (path: string, token?: string) => realFetch(base + path, {
      headers: auth(token),
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    }),
  };
}
