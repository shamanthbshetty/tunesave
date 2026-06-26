import { useState } from 'react'

export default function PlaylistCard({ item, onDownloadAll }) {
  const [expanded, setExpanded] = useState(false)
  const [tracks, setTracks] = useState([])
  const [loadingTracks, setLoadingTracks] = useState(false)

  const toggleExpand = async () => {
    if (expanded) {
      setExpanded(false)
      return
    }

    if (tracks.length === 0) {
      setLoadingTracks(true)
      try {
        const res = await fetch(`/api/search/playlist/${item.id}`)
        if (res.ok) {
          const data = await res.json()
          setTracks(data.videos || [])
        }
      } catch (err) {
        console.error('Failed to load playlist:', err)
      } finally {
        setLoadingTracks(false)
      }
    }
    setExpanded(true)
  }

  return (
    <div className="playlist-card">
      <div className="playlist-header">
        <div className="playlist-thumb-wrapper">
          <img
            src={item.thumbnail}
            alt={item.title}
            className="result-thumb"
            loading="lazy"
            onError={(e) => {
              e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><rect fill="%23222" width="160" height="90"/><text fill="%23555" x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="14">No thumbnail</text></svg>'
            }}
          />
          <div className="playlist-overlay">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
            </svg>
          </div>
        </div>
        <div className="result-info">
          <h3 className="result-title" title={item.title}>{item.title}</h3>
          <p className="result-channel">{item.channel}</p>
          <p className="result-views">{item.videoCount} videos</p>
          <div className="playlist-actions">
            <button className="download-btn" onClick={toggleExpand}>
              {expanded ? 'Collapse' : 'View Tracks'}
            </button>
            <button className="download-btn secondary" onClick={() => onDownloadAll(tracks)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download All
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="playlist-tracks">
          {loadingTracks ? (
            <div className="loading-tracks">Loading tracks...</div>
          ) : (
            <ol>
              {tracks.map((track, i) => (
                <li key={track.id} className="playlist-track">
                  <span className="track-num">{i + 1}</span>
                  <img src={track.thumbnail} alt="" className="track-thumb" />
                  <div className="track-info">
                    <span className="track-title">{track.title}</span>
                    <span className="track-channel">{track.channel}</span>
                  </div>
                  <span className="track-duration">{track.duration}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
