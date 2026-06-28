const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'config.json');
const DEFAULT_DIR = path.join(__dirname, '..', '..', 'downloads');

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (e) {}
  return { downloadDir: DEFAULT_DIR, playlists: [] };
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

function getDownloadDir() {
  const config = readConfig();
  const dir = config.downloadDir || DEFAULT_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function setDownloadDir(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Directory does not exist: ${dir}`);
  }
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) {
    throw new Error(`Path is not a directory: ${dir}`);
  }
  const testFile = path.join(dir, '.write_test');
  try {
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
  } catch (e) {
    throw new Error(`Directory is not writable: ${dir}`);
  }
  const config = readConfig();
  config.downloadDir = dir;
  writeConfig(config);
  return dir;
}

function getTempDir() {
  const dir = path.join(getDownloadDir(), '.tmp');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function cleanTempDir() {
  const tempDir = getTempDir();
  try {
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      fs.unlinkSync(path.join(tempDir, file));
    }
  } catch (e) {}
}

function getPlaylists() {
  const config = readConfig();
  return config.playlists || [];
}

function savePlaylists(playlists) {
  const config = readConfig();
  config.playlists = playlists;
  writeConfig(config);
}

function getHistoryMeta(filename) {
  const config = readConfig();
  const history = config.history || {};
  return history[filename] || {};
}

function saveHistoryMeta(filename, meta) {
  const config = readConfig();
  if (!config.history) config.history = {};
  config.history[filename] = meta;
  writeConfig(config);
}

module.exports = { getDownloadDir, setDownloadDir, getTempDir, cleanTempDir, readConfig, getPlaylists, savePlaylists, getHistoryMeta, saveHistoryMeta };
