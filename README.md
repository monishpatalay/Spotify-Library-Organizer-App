# Spotify Library Organizer

Turn your messy Spotify Liked Songs into clean, themed playlists with one natural-language prompt — powered by Claude for prompt understanding and AI mood/language classification.

## Features

- **Spotify OAuth** — connect your account and securely scan every Liked Song (pagination handled automatically)
- **Natural-language playlist requests**, e.g.:
  - `Find me all Telugu songs`
  - `Put all sad Hindi songs into a playlist called Late Night Feels`
  - `Create a playlist of all Arijit Singh songs called Arijit Hits`
  - `Put songs before 2010 into a playlist called Throwback`
  - `Create playlists for artists with more than 5 liked songs`
- **AI-powered prompt parsing** — Claude (`claude-haiku-4-5`) turns free-form prompts into structured filters (mood, language, artist, release year, artist frequency, or combined conditions), with a regex-based heuristic parser as an automatic fallback if no Anthropic key is configured
- **AI mood & language classification** — every track is tagged with one or more moods (`sad`, `happy`, `party`, `chill`, `energetic`, `workout`, `romantic`) and a detected language, using Claude plus Spotify audio features, with results cached to disk so re-scans only classify new songs
- **Language detection fallback** — lyric-based language detection (`franc` + lyrics.ovh) and Last.fm tag lookups augment classification when audio features alone aren't enough
- **Playlist preview** — review and remove matched tracks before anything is created in Spotify
- **One-click playlist creation**, with graceful handling of Spotify's Development Mode quota limits (see below)

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 18 + TypeScript + Vite, React Router |
| Backend | Node.js + Express + TypeScript |
| AI | Anthropic Claude (`@anthropic-ai/sdk`) for prompt parsing and mood/language classification |
| Music data | Spotify Web API (OAuth, library, playlists), Last.fm API (tags), lyrics.ovh + `franc` (language detection) |

## Project Structure

```
/client     Active React + TypeScript frontend (Vite) — dev server on :5173
/server     Active Node.js + Express + TypeScript backend — dev server on :3001
/frontend   Legacy frontend (unused, kept for reference)
/backend    Legacy backend (unused, kept for reference)
```

Only `client/` and `server/` are used by the `npm run dev` / `npm run install:all` scripts below. `frontend/` and `backend/` are an earlier iteration of the app and are not wired into the current build.

---

## Setup

### 1. Spotify Developer Dashboard

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Click **Create App**
3. Fill in:
   - App name: `Spotify Library Organizer` (or anything you like)
   - Redirect URI: `http://localhost:3001/api/auth/callback`
4. Go to **Settings → User Management** and add your Spotify email address (required while the app is in Development Mode)
5. Copy your **Client ID** and **Client Secret**

### 2. (Optional) Anthropic & Last.fm keys

For AI prompt parsing and mood/language classification, get an API key from the [Anthropic Console](https://console.anthropic.com/). For richer genre tagging, get a free API key from [Last.fm](https://www.last.fm/api/account/create). Both are optional — the app falls back to a regex-based parser and skips Last.fm tags if these aren't set.

### 3. Environment Variables

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3001/api/auth/callback
FRONTEND_URL=http://localhost:5173
PORT=3001

# Optional — enables AI prompt parsing + mood/language classification
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional — enables Last.fm tag lookups for genre/mood classification
LASTFM_API_KEY=your_lastfm_api_key
```

### 4. Install Dependencies

```bash
npm run install:all
```

This installs packages for both `client/` and `server/`.

---

## Running the App

Open two terminals:

**Terminal 1 — Server:**
```bash
npm run dev:server
```

**Terminal 2 — Client:**
```bash
npm run dev:client
```

Or run both with one command (requires `concurrently`):
```bash
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

There is no hosted deployment for this project — it's currently run locally, since Spotify OAuth apps in Development Mode are restricted to a fixed set of allow-listed Spotify accounts and redirect URIs.

---

## Using the App

1. Click **Connect Spotify** on the landing page
2. Authorize the app in the Spotify popup
3. Click **Scan Liked Songs** to fetch your library (an AI classification pass tags each track's mood/language in the background)
4. Type a natural-language prompt — see examples above
5. Review the preview, remove any tracks you don't want, then click **Create Spotify Playlist**

---

## Spotify Quota / Extended Quota Mode

New Spotify apps are in **Development Mode**, which restricts `POST /v1/playlists/{id}/tracks` (adding tracks returns 403).

**What happens in the app:** The playlist is still created successfully — you'll see it in Spotify. The app will show a warning and a **Copy Track URIs** button so you can add tracks manually via the Spotify desktop app (drag & drop from "Search" → paste URIs).

**To enable automatic track-adding:**

1. Go to your app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **Request Extension** (or **Extended Quota Mode**)
3. Fill in the questionnaire describing your use case
4. Once approved, track-adding will work automatically
