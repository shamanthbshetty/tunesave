import { useState } from 'react'
import useThumbnail from '../hooks/useThumbnail'

function LibraryItemArt({ title, artist }) {
  const { thumbnail, loading } = useThumbnail(title, artist)

  if (loading) {
    return <div className="skeleton-album" />
  }

  if (thumbnail) {
    return <img src={thumbnail} alt="" />
  }

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

export default function Library({ history, onPlay, currentTrack }) {
  const [search, setSearch] = useState('')

  const filtered = history.filter((f) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const name = f.name?.toLowerCase() || ''
    const artist = f.artist?.toLowerCase() || ''
    return name.includes(q) || artist.includes(q)
  })

  const formatSize = (bytes) => {
    if (!bytes) return ''
    const mb = bytes / (1024 * 1024)
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="library">
      <div className="library-header">
        <h2 className="panel-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          Library
          <span className="library-count">{history.length} songs</span>
        </h2>
        <div className="library-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search library..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="library-search-clear" onClick={() => setSearch('')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="library-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <p>{search ? 'No matching songs' : 'No downloaded songs yet'}</p>
        </div>
      ) : (
        <div className="library-list">
          {filtered.map((file) => {
            const isPlaying = currentTrack?.filename === file.name
            const displayName = file.name?.replace(/\.mp3$/i, '') || file.name
            const parts = displayName.split(' - ')
            const artist = file.artist || (parts.length > 1 ? parts[0].trim() : '')
            const title = file.title || (parts.length > 1 ? parts.slice(1).join(' - ').trim() : displayName)

            return (
              <div
                key={file.name}
                className={`library-item ${isPlaying ? 'playing' : ''}`}
                onClick={() => onPlay({
                  filename: file.name,
                  name: title,
                  artist,
                  thumbnail: file.thumbnail || '',
                })}
              >
                <div className="library-item-art">
                  <LibraryItemArt title={title} artist={artist} />
                </div>
                <div className="library-item-info">
                  <span className="library-item-title">{title}</span>
                  {artist && <span className="library-item-artist">{artist}</span>}
                </div>
                <div className="library-item-meta">
                  {file.size && <span className="library-item-size">{formatSize(file.size)}</span>}
                  {file.modified && <span className="library-item-date">{formatDate(file.modified)}</span>}
                </div>
                {isPlaying && (
                  <div className="now-playing-indicator">
                    <span /><span /><span />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
