const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { getDownloadDir, getTempDir, cleanTempDir } = require('./config');

function sanitizeFilename(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
}

function cleanTitle(title) {
  return title
    .replace(/\s*[\[(][^)\]]*(?:official|lyrics?|lyric|video|audio|visualizer|live|remix|explicit|clean|hd|4k|official video|official audio|music video)[^)\]]*[\])]\s*/gi, ' ')
    .replace(/\s*[\[(]\s*[\])]\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function downloadWithYtdlp(videoUrl, tempOutputPath, finalOutputDir, title, onProgress) {
  return new Promise((resolve, reject) => {
    const args = [
      videoUrl,
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '192K',
      '-o', tempOutputPath,
      '--no-playlist',
      '--newline',
      '--no-warnings',
      '--progress',
      '--no-overwrites',
    ];

    const proc = spawn('yt-dlp', args);
    let lastPercent = 0;

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        const match = line.match(/(\d+\.?\d*)%/);
        if (match) {
          const percent = Math.min(Math.round(parseFloat(match[1])), 100);
          if (percent !== lastPercent) {
            lastPercent = percent;
            if (onProgress) {
              onProgress({ stage: 'downloading', percent });
            }
          }
        }
      }
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      if (text.includes('%')) {
        const match = text.match(/(\d+\.?\d*)%/);
        if (match) {
          const percent = Math.min(Math.round(parseFloat(match[1])), 100);
          if (percent !== lastPercent) {
            lastPercent = percent;
            if (onProgress) {
              onProgress({ stage: 'downloading', percent });
            }
          }
        }
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        if (onProgress) onProgress({ stage: 'converting', percent: 100 });

        const tempDir = path.dirname(tempOutputPath);
        const files = fs.readdirSync(tempDir);
        const baseName = path.basename(tempOutputPath, '.%(ext)s');
        const mp3File = files.find((f) => f.startsWith(baseName) && f.endsWith('.mp3'));

        if (mp3File) {
          const src = path.join(tempDir, mp3File);
          const dest = path.join(finalOutputDir, mp3File);
          fs.renameSync(src, dest);
          resolve({ finalPath: dest, filename: mp3File });
        } else {
          reject(new Error('MP3 file not found after conversion'));
        }
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

async function downloadAsMp3(videoUrl, title, onProgress, metadata = {}) {
  const downloadDir = getDownloadDir();
  const tempDir = getTempDir();

  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  const safeName = sanitizeFilename(cleanTitle(title || 'download'));
  const tempOutputPath = path.join(tempDir, `${safeName}.%(ext)s`);
  const finalPath = path.join(downloadDir, `${safeName}.mp3`);

  if (fs.existsSync(finalPath)) {
    return { path: finalPath, filename: `${safeName}.mp3` };
  }

  if (onProgress) {
    onProgress({ stage: 'starting', percent: 0 });
  }

  const result = await downloadWithYtdlp(videoUrl, tempOutputPath, downloadDir, title, onProgress);

  cleanTempDir();

  if (onProgress) {
    onProgress({ stage: 'done', percent: 100 });
  }

  return { path: result.finalPath, filename: result.filename };
}

module.exports = { downloadAsMp3 };
