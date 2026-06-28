# TuneSave

A browser-based YouTube Music Downloader built with React and Express. Search, download, and play music with a polished glass morphism UI, real-time album art, synced lyrics, and a full-featured player.

![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18-purple)

## Features

- **Search & Download** — Search YouTube songs/playlists, download as MP3
- **Search Autocomplete** — Type to search YouTube with live results, thumbnails, and downloaded indicators
- **Real-Time Album Art** — Album covers fetched via iTunes API with dynamic color extraction
- **In-App Player** — Mini player pill + full player with canvas-based squiggly waveform seek bar
- **Synced Lyrics** — Auto-fetched from LRCLIB with click-to-seek, offset adjustment, and Inter font
- **Crossfade & Equalizer** — Smooth crossfade between tracks + 3-band EQ
- **Queue Management** — Drag-and-drop reorder, add/remove tracks
- **Playlist Management** — Create, delete, add/remove tracks, play all
- **Download History** — Auto-scanned from your download folder with now-playing indicator
- **Folder Browser** — In-app drive/folder selector for download directory
- **Concurrent Downloads** — Up to 3 simultaneous playlist tracks
- **Library & Stats** — Browse downloaded songs, view listening statistics
- **Glass Morphism UI** — Translucent panels, dynamic color gradient, skeleton loaders
- **Accessibility** — prefers-reduced-motion, focus-visible outlines, ARIA labels

## Quick Start

```bash
git clone https://github.com/shamanthbshetty/tunesave.git
cd tunesave
npm run dev
```

Dependencies install automatically. Opens at `http://localhost:5173`.

## Prerequisites

- **Node.js** ≥ 18
- **yt-dlp** — [Install](https://github.com/yt-dlp/yt-dlp#installation)
- **ffmpeg** — [Install](https://ffmpeg.org/download.html)

## Tech Stack

| Layer    | Tech                          |
|----------|-------------------------------|
| Frontend | React 19, Vite 8              |
| Backend  | Express 5, Node.js            |
| Audio    | yt-dlp, ffmpeg                |
| Lyrics   | LRCLIB (free, no API key)     |
| Album Art| iTunes Search API (free)      |
| Animations | CSS, IntersectionObserver   |

## Scripts

| Command          | Description                          |
|------------------|--------------------------------------|
| `npm run dev`    | Install deps + start server & client |
| `npm run build`  | Build client for production          |
| `npm start`      | Run production server                |

## Project Structure

```
tunesave/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── hooks/       # Custom hooks (useThumbnail)
│   │   ├── App.jsx
│   │   └── App.css
│   └── public/
├── server/              # Express backend
│   ├── routes/          # API endpoints
│   ├── services/        # yt-dlp, config, converter
│   └── index.js
├── config.json          # User settings (gitignored)
├── LICENSE
└── package.json
```

## License

MIT
