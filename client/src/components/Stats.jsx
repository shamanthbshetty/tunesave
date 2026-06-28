import { useState, useEffect } from 'react'

function getPlayCounts() {
  const raw = localStorage.getItem('yt-dl-play-counts')
  return raw ? JSON.parse(raw) : {}
}

function getListenTime() {
  const raw = localStorage.getItem('yt-dl-listen-time')
  return raw ? JSON.parse(raw) : {}
}

export default function Stats() {
  const [playCounts, setPlayCounts] = useState({})
  const [listenTime, setListenTime] = useState({})

  useEffect(() => {
    setPlayCounts(getPlayCounts())
    setListenTime(getListenTime())
  }, [])

  const totalPlays = Object.values(playCounts).reduce((a, b) => a + b, 0)
  const totalSeconds = Object.values(listenTime).reduce((a, b) => a + b, 0)
  const totalMinutes = Math.floor(totalSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  const topTracks = Object.entries(playCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const topArtists = {}
  Object.entries(listenTime).forEach(([filename, seconds]) => {
    const parts = filename.replace(/\.mp3$/i, '').split(' - ')
    const artist = parts.length > 1 ? parts[0].trim() : 'Unknown'
    topArtists[artist] = (topArtists[artist] || 0) + seconds
  })
  const topArtistsList = Object.entries(topArtists)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60)
    if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`
    return `${m}m`
  }

  if (totalPlays === 0) {
    return (
      <div className="stats">
        <h2 className="panel-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          Statistics
        </h2>
        <div className="stats-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <p>Start listening to see your stats</p>
        </div>
      </div>
    )
  }

  return (
    <div className="stats">
      <h2 className="panel-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
        Statistics
      </h2>

      <div className="stats-overview">
        <div className="stat-card">
          <span className="stat-value">{totalPlays}</span>
          <span className="stat-label">Total Plays</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}</span>
          <span className="stat-label">Listening Time</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{Object.keys(playCounts).length}</span>
          <span className="stat-label">Songs Played</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{Object.keys(topArtists).length}</span>
          <span className="stat-label">Artists</span>
        </div>
      </div>

      {topTracks.length > 0 && (
        <div className="stats-section">
          <h3 className="stats-section-title">Most Played</h3>
          <div className="stats-list">
            {topTracks.map(([filename, count], i) => {
              const parts = filename.replace(/\.mp3$/i, '').split(' - ')
              const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : filename.replace(/\.mp3$/i, '')
              return (
                <div key={filename} className="stats-list-item">
                  <span className="stats-rank">{i + 1}</span>
                  <div className="stats-list-info">
                    <span className="stats-list-name">{title}</span>
                    <span className="stats-list-sub">{count} plays</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {topArtistsList.length > 0 && (
        <div className="stats-section">
          <h3 className="stats-section-title">Top Artists</h3>
          <div className="stats-list">
            {topArtistsList.map(([artist, seconds], i) => (
              <div key={artist} className="stats-list-item">
                <span className="stats-rank">{i + 1}</span>
                <div className="stats-list-info">
                  <span className="stats-list-name">{artist}</span>
                  <span className="stats-list-sub">{formatTime(seconds)} listened</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function recordPlay(filename) {
  const counts = getPlayCounts()
  counts[filename] = (counts[filename] || 0) + 1
  localStorage.setItem('yt-dl-play-counts', JSON.stringify(counts))
}

export function recordListenTime(filename, seconds) {
  const times = getListenTime()
  times[filename] = (times[filename] || 0) + seconds
  localStorage.setItem('yt-dl-listen-time', JSON.stringify(times))
}
