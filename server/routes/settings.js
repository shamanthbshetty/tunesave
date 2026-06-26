const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { getDownloadDir, setDownloadDir } = require('../services/config');

router.get('/', (req, res) => {
  res.json({ downloadDir: getDownloadDir() });
});

router.post('/', (req, res) => {
  try {
    const { downloadDir } = req.body;
    if (!downloadDir) {
      return res.status(400).json({ error: 'downloadDir is required' });
    }
    const dir = setDownloadDir(downloadDir);
    res.json({ success: true, downloadDir: dir });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/drives', (req, res) => {
  if (process.platform === 'win32') {
    exec('wmic logicaldisk get name,volumename', (err, stdout) => {
      if (err) {
        return res.json({ drives: [{ name: 'C:\\', label: 'Local Disk' }] });
      }
      const lines = stdout.split('\n').map((l) => l.trim()).filter(Boolean);
      const headerIdx = lines.findIndex((l) => /^Name\s/i.test(l));
      const drives = [];
      for (let i = headerIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^([A-Z]:\\?)\s+(.*)$/);
        if (match) {
          const name = match[1].endsWith('\\') ? match[1] : match[1] + '\\';
          const label = match[2].trim() || 'Local Disk';
          drives.push({ name, label });
        } else if (/^[A-Z]:\\?$/.test(line)) {
          drives.push({ name: line.endsWith('\\') ? line : line + '\\', label: 'Local Disk' });
        }
      }
      if (drives.length === 0) {
        drives.push({ name: 'C:\\', label: 'Local Disk' });
      }
      res.json({ drives });
    });
  } else {
    const drives = [{ name: '/', label: 'Root' }];
    try {
      const entries = fs.readdirSync('/media');
      for (const e of entries) {
        const full = path.join('/media', e);
        if (fs.statSync(full).isDirectory()) drives.push({ name: full, label: e });
      }
    } catch (e) {}
    res.json({ drives });
  }
});

router.get('/browse', (req, res) => {
  const dirPath = req.query.path;
  if (!dirPath) {
    return res.status(400).json({ error: 'path is required' });
  }
  try {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      return res.json({ folders: [], path: dirPath });
    }
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const folders = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    res.json({ folders, path: dirPath });
  } catch (err) {
    res.json({ folders: [], path: dirPath, error: err.message });
  }
});

router.get('/history', (req, res) => {
  const downloadDir = getDownloadDir();
  try {
    if (!fs.existsSync(downloadDir)) {
      return res.json({ files: [] });
    }
    const entries = fs.readdirSync(downloadDir);
    const files = entries
      .filter((f) => f.endsWith('.mp3'))
      .map((f) => {
        const stat = fs.statSync(path.join(downloadDir, f));
        let meta = {};
        const metaFile = f.replace(/\.mp3$/i, '.meta.json');
        const metaPath = path.join(downloadDir, metaFile);
        try {
          if (fs.existsSync(metaPath)) {
            meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          }
        } catch (e) {}
        return {
          name: f,
          size: stat.size,
          modified: stat.mtime,
          thumbnail: meta.thumbnail || '',
          artist: meta.artist || '',
          title: meta.title || '',
        };
      })
      .sort((a, b) => b.modified - a.modified);
    res.json({ files });
  } catch (err) {
    res.json({ files: [] });
  }
});

let suggestionsCache = { data: null, timestamp: 0 };
const SUGGESTIONS_CACHE_TTL = 60000;

router.get('/suggestions', async (req, res) => {
  const now = Date.now();
  if (suggestionsCache.data && now - suggestionsCache.timestamp < SUGGESTIONS_CACHE_TTL) {
    return res.json({ suggestions: suggestionsCache.data });
  }

  const downloadDir = getDownloadDir();
  try {
    if (!fs.existsSync(downloadDir)) {
      return res.json({ suggestions: [] });
    }
    const entries = fs.readdirSync(downloadDir);
    const recent = entries
      .filter((f) => f.endsWith('.mp3'))
      .map((f) => {
        const stat = fs.statSync(path.join(downloadDir, f));
        return { name: f, modified: stat.mtime };
      })
      .sort((a, b) => b.modified - a.modified)
      .slice(0, 5);

    if (recent.length === 0) {
      return res.json({ suggestions: [] });
    }

    const artists = [];
    for (const file of recent) {
      const base = file.name.replace(/\.mp3$/i, '');
      const sepIdx = base.indexOf(' - ');
      if (sepIdx > 0) {
        const artist = base.substring(0, sepIdx).trim();
        if (artist && !artists.includes(artist)) {
          artists.push(artist);
        }
      }
    }

    if (artists.length === 0) {
      return res.json({ suggestions: [] });
    }

    const { search } = require('../services/youtube');
    const seen = new Set();
    const suggestions = [];

    const artistSearches = artists.slice(0, 3).map(async (artist) => {
      try {
        const results = await search(`${artist} music`, 3);
        return results.map((r) => ({ ...r, reason: artist }));
      } catch (e) {
        return [];
      }
    });

    const allResults = await Promise.all(artistSearches);
    for (const results of allResults) {
      for (const r of results) {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          suggestions.push(r);
        }
      }
    }

    suggestionsCache = { data: suggestions, timestamp: Date.now() };
    res.json({ suggestions });
  } catch (err) {
    res.json({ suggestions: [] });
  }
});

module.exports = router;
