# TuneSave

A browser-based YouTube Music Downloader built with React and Express. Search, download, and play music with a built-in player featuring rotating vinyl animation and synced lyrics.

![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18-purple)

## Features

- **Search & Download** — Search YouTube songs/playlists, download as MP3
- **In-App Player** — Mini player bar + full player view with rotating vinyl disc
- **Synced Lyrics** — Auto-fetched from LRCLIB with duration-based matching + manual offset adjustment
- **Playlist Management** — Create, delete, add/remove tracks, play all
- **Download History** — Auto-scanned from your download folder
- **Folder Browser** — In-app drive/folder selector for download directory
- **Concurrent Downloads** — Up to 3 simultaneous playlist tracks
- **Dark Theme** — Purple accent, Spotify-inspired UI with animations

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
| Animations | Framer Motion, CSS          |

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
