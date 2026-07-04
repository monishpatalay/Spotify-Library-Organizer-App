# Spotify Library Organizer

Turn your messy Liked Songs into clean playlists with one natural-language prompt.

## Features

- Connect your Spotify account via OAuth
- Scan all your Liked Songs (handles pagination automatically)
- Filter by artist, language/genre (Punjabi, Hindi), release year, or artist frequency
- Preview matched tracks before creating the playlist
- Create Spotify playlists with one click

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

### 2. Environment Variables

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
```

### 3. Install Dependencies

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

---

## Using the App

1. Click **Connect Spotify** on the landing page
2. Authorize the app in the Spotify popup
3. Click **Scan Liked Songs** to fetch your library
4. Type a natural-language prompt, for example:
   - `Put all Punjabi songs into a playlist called Punjabi Vibes`
   - `Create a playlist of all Arijit Singh songs called Arijit Hits`
   - `Put songs before 2010 into a playlist called Throwback`
   - `Put songs after 2020 into a playlist called Fresh Picks`
   - `Create playlists for artists with more than 5 liked songs`
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

---

## Project Structure

```
/client         React + TypeScript frontend (Vite)
/server         Node.js + Express + TypeScript backend
/frontend       Legacy frontend (unused)
/backend        Legacy backend (unused)
```
