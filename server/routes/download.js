const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { downloadAsMp3 } = require('../services/converter');
const { getDownloadDir } = require('../services/config');
const path = require('path');
const fs = require('fs');

const activeDownloads = new Map();

router.post('/', async (req, res) => {
  try {
    const { url, title, thumbnail, artist } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const downloadId = uuidv4();
    const progressClients = [];

    activeDownloads.set(downloadId, { progressClients, status: 'starting' });

    res.json({ downloadId, message: 'Download started' });

    (async () => {
      try {
        const downloadTitle = title || 'download';

        broadcast(downloadId, { stage: 'starting', title: downloadTitle });

        const result = await downloadAsMp3(
          url,
          downloadTitle,
          (progress) => {
            broadcast(downloadId, progress);
          },
          { title: downloadTitle, artist: artist || '', thumbnail: thumbnail || '' }
        );

        activeDownloads.set(downloadId, {
          ...activeDownloads.get(downloadId),
          status: 'done',
          filename: result.filename,
        });

        broadcast(downloadId, { stage: 'done', filename: result.filename });
      } catch (err) {
        console.error('Download error:', err);
        activeDownloads.set(downloadId, {
          ...activeDownloads.get(downloadId),
          status: 'error',
          error: err.message,
        });
        broadcast(downloadId, { stage: 'error', error: err.message });
      }
    })();
  } catch (err) {
    console.error('Download init error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/progress/:id', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const download = activeDownloads.get(req.params.id);
  if (download) {
    download.progressClients.push(res);
  }

  req.on('close', () => {
    const dl = activeDownloads.get(req.params.id);
    if (dl) {
      dl.progressClients = dl.progressClients.filter((c) => c !== res);
    }
  });
});

router.get('/file/:filename', (req, res) => {
  const downloadDir = getDownloadDir();
  const filePath = path.join(downloadDir, decodeURIComponent(req.params.filename));

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath, decodeURIComponent(req.params.filename), (err) => {
    if (err) {
      console.error('File download error:', err);
    }
  });
});

router.get('/play/:filename', (req, res) => {
  const downloadDir = getDownloadDir();
  const filePath = path.join(downloadDir, decodeURIComponent(req.params.filename));

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'audio/mpeg',
    });

    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'audio/mpeg',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

function broadcast(downloadId, data) {
  const download = activeDownloads.get(downloadId);
  if (!download) return;

  const message = `data: ${JSON.stringify(data)}\n\n`;
  download.progressClients.forEach((client) => {
    try {
      client.write(message);
    } catch (e) {}
  });
}

module.exports = router;
