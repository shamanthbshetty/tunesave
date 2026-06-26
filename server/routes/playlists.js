const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getPlaylists, savePlaylists } = require('../services/config');

router.get('/', (req, res) => {
  res.json({ playlists: getPlaylists() });
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Playlist name is required' });
  }
  const playlists = getPlaylists();
  const playlist = {
    id: uuidv4(),
    name: name.trim(),
    tracks: [],
    createdAt: new Date().toISOString(),
  };
  playlists.push(playlist);
  savePlaylists(playlists);
  res.json({ playlist });
});

router.delete('/:id', (req, res) => {
  let playlists = getPlaylists();
  const before = playlists.length;
  playlists = playlists.filter((p) => p.id !== req.params.id);
  if (playlists.length === before) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  savePlaylists(playlists);
  res.json({ success: true });
});

router.post('/:id/tracks', (req, res) => {
  const { filename, name, artist } = req.body;
  if (!filename) {
    return res.status(400).json({ error: 'filename is required' });
  }
  const playlists = getPlaylists();
  const playlist = playlists.find((p) => p.id === req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  if (playlist.tracks.some((t) => t.filename === filename)) {
    return res.json({ playlist });
  }
  playlist.tracks.push({ filename, name: name || filename.replace('.mp3', ''), artist: artist || '' });
  savePlaylists(playlists);
  res.json({ playlist });
});

router.delete('/:id/tracks/:filename', (req, res) => {
  const playlists = getPlaylists();
  const playlist = playlists.find((p) => p.id === req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  const decoded = decodeURIComponent(req.params.filename);
  playlist.tracks = playlist.tracks.filter((t) => t.filename !== decoded);
  savePlaylists(playlists);
  res.json({ playlist });
});

module.exports = router;
