const express = require('express');
const router = express.Router();
const yt = require('../services/youtube');

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
