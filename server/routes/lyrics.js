const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const { artist, track, duration } = req.query;
  if (!artist || !track) {
    return res.status(400).json({ error: 'artist and track are required' });
  }

  const targetDuration = duration ? parseFloat(duration) : null;
  const headers = { 'User-Agent': 'TuneSave/1.0 (https://github.com/shamanthbshetty/tunesave)' };

  try {
    // 1. Try /api/get for exact match first
    const getUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}${targetDuration != null ? `&duration=${Math.round(targetDuration)}` : ''}`;
    const getRes = await fetch(getUrl, { headers });

    if (getRes.ok) {
      const exact = await getRes.json();
      if (exact && (exact.syncedLyrics || exact.plainLyrics)) {
        return res.json({
          plainLyrics: exact.plainLyrics || null,
          syncedLyrics: exact.syncedLyrics || null,
        });
      }
    }

    // 2. Fall back to /api/search with duration-based filtering
    const searchUrl = `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}`;
    const searchRes = await fetch(searchUrl, { headers });

    if (!searchRes.ok) {
      return res.json({ plainLyrics: null, syncedLyrics: null });
    }

    const results = await searchRes.json();
    if (!results || results.length === 0) {
      return res.json({ plainLyrics: null, syncedLyrics: null });
    }

    let best = results[0];
    if (targetDuration !== null) {
      let bestDiff = Infinity;
      for (const r of results) {
        if (r.duration != null) {
          const diff = Math.abs(r.duration - targetDuration);
          if (diff < bestDiff) {
            bestDiff = diff;
            best = r;
          }
        }
      }
    }

    res.json({
      plainLyrics: best.plainLyrics || null,
      syncedLyrics: best.syncedLyrics || null,
    });
  } catch (err) {
    console.error('Lyrics fetch error:', err.message);
    res.json({ plainLyrics: null, syncedLyrics: null });
  }
});

module.exports = router;
