import { useState, useEffect } from 'react'

export default function PlaylistManager({ playlists, onRefresh, onPlayTrack, currentTrack }) {
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      setNewName('')
      onRefresh()
    } catch (err) {
      console.error('Failed to create playlist:', err)
    } finally {
      setCreating(false)
    }
  }

  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const handleDelete = async (id) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      return
    }
    setConfirmDeleteId(null)
    try {
      await fetch(`/api/playlists/${id}`, { method: 'DELETE' })
      onRefresh()
      if (expandedId === id) setExpandedId(null)
    } catch (err) {
      console.error('Failed to delete playlist:', err)
    }
  }

  const handlePlayAll = (playlist) => {
    if (playlist.tracks.length > 0) {
      onPlayTrack(playlist.tracks[0], playlist.tracks, 0)
    }
  }

  const handleRemoveTrack = async (playlistId, filename) => {
    try {
      await fetch(`/api/playlists/${playlistId}/tracks/${encodeURIComponent(filename)}`, { method: 'DELETE' })
      onRefresh()
    } catch (err) {
      console.error('Failed to remove track:', err)
    }
  }

  return (
    <div className="playlist-manager">
      <h2 className="panel-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        My Playlists
      </h2>

      <div className="playlist-create">
        <input
          type="text"
          className="playlist-input"
          placeholder="New playlist name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          disabled={creating}
        />
        <button className="playlist-create-btn" onClick={handleCreate} disabled={creating || !newName.trim()}>
          {creating ? '...' : '+'}
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="playlist-empty">No playlists yet</div>
      ) : (
        <div className="playlist-list">
          {playlists.map((pl) => (
            <div key={pl.id} className="playlist-entry">
              <div className="playlist-entry-header" onClick={() => setExpandedId(expandedId === pl.id ? null : pl.id)}>
                <div className="playlist-entry-info">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                  <span className="playlist-entry-name">{pl.name}</span>
                  <span className="playlist-entry-count">{pl.tracks.length}</span>
                </div>
                <div className="playlist-entry-actions" onClick={(e) => e.stopPropagation()}>
                  {pl.tracks.length > 0 && (
                    <button className="playlist-play-btn" onClick={() => handlePlayAll(pl)} title="Play all">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  )}
                  <button className={`playlist-delete-btn ${confirmDeleteId === pl.id ? 'confirm-delete' : ''}`} onClick={() => handleDelete(pl.id)} title={confirmDeleteId === pl.id ? 'Click again to confirm' : 'Delete playlist'}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {expandedId === pl.id && pl.tracks.length > 0 && (
                <div className="playlist-entry-tracks">
                  {pl.tracks.map((track, i) => (
                    <div
                      key={track.filename}
                      className={`playlist-entry-track ${currentTrack?.filename === track.filename ? 'playing' : ''}`}
                      onClick={() => onPlayTrack(track, pl.tracks, i)}
                    >
                      <span className="pet-num">{i + 1}</span>
                      <div className="pet-info">
                        <span className="pet-name">{track.name}</span>
                        <span className="pet-artist">{track.artist}</span>
                      </div>
                      <button className="pet-remove" onClick={(e) => { e.stopPropagation(); handleRemoveTrack(pl.id, track.filename) }} title="Remove">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
