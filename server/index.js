const express = require('express');
const cors = require('cors');
const path = require('path');

const searchRoutes = require('./routes/search');
const downloadRoutes = require('./routes/download');
const settingsRoutes = require('./routes/settings');
const lyricsRoutes = require('./routes/lyrics');
const playlistsRoutes = require('./routes/playlists');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/search', searchRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/lyrics', lyricsRoutes);
app.use('/api/playlists', playlistsRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
