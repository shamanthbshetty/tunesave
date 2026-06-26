const { execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execFileAsync = promisify(execFile);

const YT_DLP = 'yt-dlp';

function runYtDlp(args, timeout = 60000) {
  return new Promise((resolve, reject) => {
    execFile(YT_DLP, args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

async function search(query, limit = 10) {
  const args = [
    `ytsearch${limit}:${query}`,
    '--dump-json',
    '--no-download',
    '--flat-playlist',
    '--no-warnings',
  ];

  const stdout = await runYtDlp(args);
  const items = [];

  for (const line of stdout.trim().split('\n')) {
    if (!line) continue;
    try {
      const data = JSON.parse(line);
      items.push({
        id: data.id,
        title: data.title || 'Unknown',
        channel: data.uploader || data.channel || 'Unknown',
        thumbnail: data.thumbnails?.[data.thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg`,
        duration: formatDuration(data.duration),
        durationRaw: data.duration || null,
        views: data.view_count ? formatNumber(data.view_count) + ' views' : '',
        url: data.url || `https://www.youtube.com/watch?v=${data.id}`,
        type: 'video',
      });
    } catch (e) {}
  }

  return items;
}

async function searchPlaylists(query, limit = 5) {
  const args = [
    `ytsearch${limit}:${query}`,
    '--dump-json',
    '--no-download',
    '--flat-playlist',
    '--no-warnings',
    '--match-filter', 'playlist',
  ];

  let stdout;
  try {
    stdout = await runYtDlp(args);
  } catch (e) {
    return [];
  }

  const items = [];
  for (const line of stdout.trim().split('\n')) {
    if (!line) continue;
    try {
      const data = JSON.parse(line);
      if (data._type === 'playlist' || data.playlist) {
        items.push({
          id: data.playlist_id || data.id,
          title: data.playlist || data.title || 'Unknown Playlist',
          channel: data.uploader || data.channel || 'Unknown',
          thumbnail: data.thumbnails?.[data.thumbnails.length - 1]?.url || '',
          videoCount: data.playlist_count || 0,
          url: `https://www.youtube.com/playlist?list=${data.playlist_id || data.id}`,
          type: 'playlist',
        });
      }
    } catch (e) {}
  }

  return items;
}

async function getPlaylistVideos(playlistId) {
  const url = playlistId.startsWith('http') ? playlistId : `https://www.youtube.com/playlist?list=${playlistId}`;
  const args = [
    url,
    '--dump-json',
    '--no-download',
    '--flat-playlist',
    '--no-warnings',
  ];

  const stdout = await runYtDlp(args, 120000);
  const videos = [];

  for (const line of stdout.trim().split('\n')) {
    if (!line) continue;
    try {
      const data = JSON.parse(line);
      videos.push({
        id: data.id,
        title: data.title || 'Unknown',
        channel: data.uploader || data.channel || 'Unknown',
        thumbnail: data.thumbnails?.[data.thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg`,
        duration: formatDuration(data.duration),
        durationRaw: data.duration || null,
        url: data.url || `https://www.youtube.com/watch?v=${data.id}`,
      });
    } catch (e) {}
  }

  return {
    title: videos[0]?.playlist || 'Playlist',
    channel: videos[0]?.uploader || 'Unknown',
    videos,
  };
}

function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatNumber(num) {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}

module.exports = {
  search,
  searchPlaylists,
  getPlaylistVideos,
  runYtDlp,
};
