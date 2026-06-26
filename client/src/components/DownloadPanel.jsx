import { useState } from 'react'

export default function DownloadPanel({ downloads, onRemove, history, onPlay, currentTrack, playlists, onAddToPlaylist }) {
  const [dropdownId, setDropdownId] = useState(null)

  const formatSize = (bytes) => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB'
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB'
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return bytes + ' B'
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const parseTrackName = (filename) => {
    const base = filename.replace(/\.mp3$/i, '')
    const sep = base.indexOf(' - ')
    if (sep > 0) {
      return { artist: base.substring(0, sep).trim(), name: base.substring(sep + 3).trim() }
    }
    return { artist: '', name: base }
  }

  const isPlaying = (filename) => currentTrack?.filename === filename

  const handlePlayFile = (file) => {
    const parsed = parseTrackName(file.name)
    onPlay({ filename: file.name, name: parsed.name, artist: parsed.artist })
  }

  return (
    <div className="download-panel">
      {downloads.length > 0 && (
        <>
          <h2 className="panel-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Downloads
          </h2>
          <div className="download-list">
            {downloads.map((dl) => (
              <div key={dl.id} className={`download-item ${dl.status}`}>
                <img src={dl.thumbnail} alt="" className="dl-thumb" />
                <div className="dl-info">
                  <p className="dl-title" title={dl.title}>{dl.title}</p>
                  <p className="dl-channel">{dl.channel}</p>
                  {dl.status === 'done' && dl.filename ? (
                    <div className="dl-complete">
                      <button className="dl-link" onClick={() => {
                        const parsed = parseTrackName(dl.filename)
                        onPlay({ filename: dl.filename, name: parsed.name, artist: parsed.artist, thumbnail: dl.thumbnail })
                      }}>
                        Play
                      </button>
                      <a href={`/api/download/file/${encodeURIComponent(dl.filename)}`} className="dl-link" download>
                        Save
                      </a>
                    </div>
                  ) : dl.status === 'error' ? (
                    <p className="dl-error">{dl.error}</p>
                  ) : (
                    <div className="dl-progress-wrapper">
                      <div className="dl-progress-bar">
                        <div className="dl-progress-fill" style={{ width: `${dl.progress}%` }} />
                      </div>
                      <span className="dl-progress-text">
                        {dl.stage === 'converting' ? 'Converting...' : dl.stage === 'starting' ? 'Starting...' : `${dl.progress}%`}
                      </span>
                    </div>
                  )}
                </div>
                <button className="dl-remove" onClick={() => onRemove(dl.id)} title="Remove">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {history.length > 0 && (
        <div className="history-section">
          <h2 className="panel-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Previously Downloaded ({history.length})
          </h2>
          <div className="history-list">
            {history.map((file) => {
              const playing = isPlaying(file.name)
              return (
                <div key={file.name} className={`history-item ${playing ? 'now-playing' : ''}`}>
                  {playing ? (
                    <div className="now-playing-indicator">
                      <span className="eq-bar" />
                      <span className="eq-bar" />
                      <span className="eq-bar" />
                    </div>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="history-icon">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  )}
                  <div className="history-info" onClick={() => handlePlayFile(file)}>
                    <span className="history-name" title={file.name}>{file.name.replace('.mp3', '')}</span>
                    <span className="history-meta">{formatSize(file.size)} &middot; {formatDate(file.modified)}</span>
                  </div>
                  <div className="history-actions">
                    <button className="dl-link playlist-add-btn" title="Add to playlist" onClick={() => setDropdownId(dropdownId === file.name ? null : file.name)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                    <a href={`/api/download/file/${encodeURIComponent(file.name)}`} className="dl-link" download title="Save">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </a>
                    {dropdownId === file.name && playlists.length > 0 && (
                      <div className="playlist-dropdown">
                        {playlists.map((pl) => (
                          <button key={pl.id} className="playlist-dropdown-item" onClick={() => {
                            const parsed = parseTrackName(file.name)
                            onAddToPlaylist(pl.id, { filename: file.name, name: parsed.name, artist: parsed.artist })
                            setDropdownId(null)
                          }}>
                            {pl.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {downloads.length === 0 && history.length === 0 && (
        <div className="panel-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <p>No downloads yet</p>
        </div>
      )}
    </div>
  )
}
