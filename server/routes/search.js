const express = require('express');
const router = express.Router();
const yt = require('../services/youtube');

const suggestCache = new Map();

router.get('/suggest', async (req, res) => {
  const q = req.query.q;
  if (!q || q.length < 3) return res.json({ results: [] });

  const key = q.toLowerCase().trim();
  if (suggestCache.has(key)) return res.json({ results: suggestCache.get(key) });

  try {
    const results = await yt.search(q, 8);
    const songs = results.filter((r) => r.durationRaw && r.durationRaw >= 60 && r.durationRaw <= 600);
    suggestCache.set(key, songs);
    setTimeout(() => suggestCache.delete(key), 30000);
    return res.json({ results: songs });
  } catch (e) {}

  res.json({ results: [] });
});

router.get('/', async (req, res) => {
  try {
    const { q, type = 'video', limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    if (type === 'playlist') {
      const results = await yt.searchPlaylists(q, parseInt(limit));
      return res.json({ results, type: 'playlist' });
    }

    const results = await yt.search(q, parseInt(limit));
    res.json({ results, type: 'video' });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed: ' + err.message });
  }
});

router.get('/playlist/:id', async (req, res) => {
  try {
    const data = await yt.getPlaylistVideos(req.params.id);
    res.json(data);
  } catch (err) {
    console.error('Playlist fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch playlist: ' + err.message });
  }
});

module.exports = router;
