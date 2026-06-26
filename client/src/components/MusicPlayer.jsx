import { useState, useEffect, useRef, useCallback } from 'react'
import StarBorder from './StarBorder'

function parseLRC(lrc) {
  if (!lrc) return []
  const lines = lrc.split('\n')
  const result = []
  for (const line of lines) {
    const match = line.match(/^\[(\d+):(\d+\.?\d*)\](.*)$/)
    if (match) {
      const minutes = parseInt(match[1], 10)
      const seconds = parseFloat(match[2])
      const text = match[3].trim()
      if (text) {
        result.push({ time: minutes * 60 + seconds, text })
      }
    }
  }
  return result.sort((a, b) => a.time - b.time)
}

function cleanLyricsQuery(str) {
  if (!str) return ''
  return str
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\|.*$/i, '')
    .replace(/[-–]\s*Topic$/i, '')
    .replace(/\bft\.?\b.*$/i, '')
    .replace(/\bfeat\.?\b.*$/i, '')
    .trim()
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function SeekBar({ value, max, onChange }) {
  const trackRef = useRef(null)
  const [hovering, setHovering] = useState(false)
  const [dragging, setDragging] = useState(false)

  const getValueFromEvent = (e) => {
    if (!trackRef.current || !max) return 0
    const rect = trackRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    return pct * max
  }

  const handlePointerDown = (e) => {
    setDragging(true)
    onChange(getValueFromEvent(e))
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e) => {
    if (!dragging) return
    onChange(getValueFromEvent(e))
  }

  const handlePointerUp = () => setDragging(false)

  const thick = hovering || dragging
  const pct = max ? (value / max) * 100 : 0

  return (
    <div className="seek-row">
      <span className="time-text">{formatTime(value)}</span>
      <div
        ref={trackRef}
        className={`seek-bar ${thick ? 'seek-bar--thick' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => { setHovering(false); if (!dragging) setDragging(false) }}
      >
        <div className="seek-bar-fill" style={{ width: `${pct}%` }} />
        <div className="seek-bar-thumb" style={{ left: `${pct}%` }} />
      </div>
      <span className="time-text">{formatTime(max)}</span>
    </div>
  )
}

const VolumeIcon = ({ volume }) => {
  if (volume === 0) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </svg>
    )
  }
  if (volume < 0.5) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

function VolumeBar({ volume, onChange }) {
  const trackRef = useRef(null)
  const [hovering, setHovering] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [pulseKey, setPulseKey] = useState(0)

  const getValueFromEvent = (e) => {
    if (!trackRef.current) return volume * 100
    const rect = trackRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    return Math.round(pct * 100)
  }

  const handlePointerDown = (e) => {
    setDragging(true)
    const val = getValueFromEvent(e)
    onChange(val)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e) => {
    if (!dragging) return
    const val = getValueFromEvent(e)
    onChange(val)
  }

  const handlePointerUp = () => {
    setDragging(false)
  }

  useEffect(() => {
    setPulseKey((k) => k + 1)
  }, [volume])

  const thick = hovering || dragging

  return (
    <div className="volume-row">
      <VolumeIcon volume={volume} />
      <div
        ref={trackRef}
        className={`volume-bar ${thick ? 'volume-bar--thick' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => { setHovering(false); if (!dragging) setDragging(false) }}
      >
        <div className="volume-bar-fill" style={{ width: `${volume * 100}%` }} />
        <div className="volume-bar-thumb" style={{ left: `${volume * 100}%` }} />
      </div>
    </div>
  )
}

export default function MusicPlayer({
  currentTrack,
  expanded,
  onExpand,
  onCollapse,
  queue,
  queueIndex,
  onNext,
  onPrev,
  onShuffleNext,
  cacheLyrics,
}) {
  const audioRef = useRef(null)
  const lyricsContainerRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('yt-dl-volume')
    return saved !== null ? parseFloat(saved) : 0.8
  })
  const [lyrics, setLyrics] = useState([])
  const [syncedLyrics, setSyncedLyrics] = useState([])
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1)
  const [lyricsLoading, setLyricsLoading] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [repeatMode, setRepeatMode] = useState('off')
  const [lyricsOffset, setLyricsOffset] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    localStorage.setItem('yt-dl-volume', volume.toString())
  }, [volume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    audio.src = `/api/download/play/${encodeURIComponent(currentTrack.filename)}`
    audio.load()
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    setCurrentTime(0)
    setDuration(0)
    setLyrics([])
    setSyncedLyrics([])
    setActiveLyricIndex(-1)
  }, [currentTrack?.filename])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }, [playing])

  const fetchLyrics = useCallback(async (track) => {
    if (!track) return
    setLyricsLoading(true)

    const cacheKey = `lyrics-cache-${track.filename}`
    if (cacheLyrics) {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try {
          const data = JSON.parse(cached)
          if (data.syncedLyrics) {
            setSyncedLyrics(parseLRC(data.syncedLyrics))
            setLyrics([])
          } else if (data.plainLyrics) {
            setLyrics(data.plainLyrics.split('\n').filter((l) => l.trim()))
            setSyncedLyrics([])
          }
          setLyricsLoading(false)
          return
        } catch {}
      }
    }

    const rawArtist = track.artist || track.name?.split(' - ')[0] || ''
    const rawTrack = track.name?.split(' - ').slice(1).join(' - ') || track.name || ''
    const artist = cleanLyricsQuery(rawArtist)
    const trackName = cleanLyricsQuery(rawTrack)
    const durParam = track.durationRaw ? `&duration=${track.durationRaw}` : ''

    try {
      const res = await fetch(`/api/lyrics?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(trackName)}${durParam}`)
      const data = await res.json()
      if (data.syncedLyrics) {
        setSyncedLyrics(parseLRC(data.syncedLyrics))
        setLyrics([])
      } else if (data.plainLyrics) {
        setLyrics(data.plainLyrics.split('\n').filter((l) => l.trim()))
        setSyncedLyrics([])
      } else {
        setLyrics([])
        setSyncedLyrics([])
      }

      if (cacheLyrics && (data.syncedLyrics || data.plainLyrics)) {
        localStorage.setItem(cacheKey, JSON.stringify({
          syncedLyrics: data.syncedLyrics || null,
          plainLyrics: data.plainLyrics || null,
        }))
      }
    } catch {
      setLyrics([])
      setSyncedLyrics([])
    } finally {
      setLyricsLoading(false)
    }
  }, [cacheLyrics])

  useEffect(() => {
    if (!currentTrack) return
    fetchLyrics(currentTrack)
  }, [currentTrack?.filename, currentTrack?.artist, currentTrack?.name, fetchLyrics])

  useEffect(() => {
    const handleOnline = () => {
      if (currentTrack && lyrics.length === 0 && syncedLyrics.length === 0 && !lyricsLoading) {
        fetchLyrics(currentTrack)
      }
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [currentTrack, lyrics.length, syncedLyrics.length, lyricsLoading, fetchLyrics])

  useEffect(() => {
    if (!currentTrack) return
    const saved = localStorage.getItem(`lyrics-offset-${currentTrack.filename}`)
    setLyricsOffset(saved !== null ? parseFloat(saved) : 0)
  }, [currentTrack?.filename])

  useEffect(() => {
    if (syncedLyrics.length === 0) return
    let idx = -1
    for (let i = syncedLyrics.length - 1; i >= 0; i--) {
      if (currentTime >= syncedLyrics[i].time + lyricsOffset) {
        idx = i
        break
      }
    }
    if (idx !== activeLyricIndex) {
      setActiveLyricIndex(idx)
      if (lyricsContainerRef.current && idx >= 0) {
        const activeEl = lyricsContainerRef.current.children[idx]
        if (activeEl) {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }
  }, [currentTime, syncedLyrics, activeLyricIndex, lyricsOffset])

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (audio) setCurrentTime(audio.currentTime)
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current
    if (audio) setDuration(audio.duration)
  }, [])

  const handleEnded = useCallback(() => {
    if (repeatMode === 'one') {
      const audio = audioRef.current
      if (audio) { audio.currentTime = 0; audio.play() }
    } else if (shuffle && onShuffleNext) {
      onShuffleNext()
    } else if (onNext) {
      onNext()
    } else {
      setPlaying(false)
    }
  }, [repeatMode, shuffle, onNext, onShuffleNext])

  const togglePlay = () => setPlaying((p) => !p)

  const handleSeek = (val) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    audio.currentTime = val
    setCurrentTime(val)
  }

  const toggleRepeat = () => {
    setRepeatMode((m) => m === 'off' ? 'all' : m === 'all' ? 'one' : 'off')
  }

  const handleVolumeChange = (val) => {
    setVolume(val / 100)
    if (audioRef.current) audioRef.current.volume = val / 100
  }

  const handleKey = useCallback((e) => {
    if (e.target.tagName === 'INPUT') return
    if (e.code === 'Space') { e.preventDefault(); togglePlay() }
    if (e.code === 'ArrowRight') { e.preventDefault(); if (audioRef.current) audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5) }
    if (e.code === 'ArrowLeft') { e.preventDefault(); if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5) }
    if (e.code === 'ArrowUp') { e.preventDefault(); setVolume((v) => { const nv = Math.min(1, v + 0.1); if (audioRef.current) audioRef.current.volume = nv; return nv }) }
    if (e.code === 'ArrowDown') { e.preventDefault(); setVolume((v) => { const nv = Math.max(0, v - 0.1); if (audioRef.current) audioRef.current.volume = nv; return nv }) }
  }, [duration])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [])

  const trackName = currentTrack?.name || 'No track'
  const artistName = currentTrack?.artist || ''
  const thumbnail = currentTrack?.thumbnail || ''

  if (!currentTrack) return <audio ref={audioRef} />

  if (expanded) {
    return (
      <div className="music-player-full">
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
        <button className="player-collapse-btn" onClick={onCollapse} title="Minimize">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div className="full-player-content">
          <div className="full-player-left">
            <div className={`vinyl-container ${playing ? 'spinning' : ''}`}>
              {thumbnail && (
                <div className="vinyl-art">
                  <img src={thumbnail} alt="" />
                </div>
              )}
              <div className="vinyl-disc">
                <div className="vinyl-groove" />
                <div className="vinyl-groove groove-2" />
                <div className="vinyl-groove groove-3" />
                <div className="vinyl-sheen" />
                {thumbnail && (
                  <div className="vinyl-label">
                    <div className="vinyl-hole" />
                  </div>
                )}
              </div>
            </div>
            <div className="full-player-info">
              <h2 className="full-player-title">{trackName}</h2>
              <p className="full-player-artist">{artistName}</p>
            </div>
          </div>

          <div className="full-player-right">
            <div className="lyrics-header">
              <div className="lyrics-header-left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
                Lyrics
              </div>
              {syncedLyrics.length > 0 && (
                <div className="lyrics-offset-controls">
                  <button
                    className="lyrics-offset-btn"
                    onClick={() => {
                      const next = Math.round((lyricsOffset - 0.5) * 10) / 10
                      setLyricsOffset(next)
                      if (currentTrack) localStorage.setItem(`lyrics-offset-${currentTrack.filename}`, next.toString())
                    }}
                    title="Lyrics earlier"
                  >
                    −0.5s
                  </button>
                  {lyricsOffset !== 0 && (
                    <span className="lyrics-offset-value">{lyricsOffset > 0 ? '+' : ''}{lyricsOffset}s</span>
                  )}
                  <button
                    className="lyrics-offset-btn"
                    onClick={() => {
                      const next = Math.round((lyricsOffset + 0.5) * 10) / 10
                      setLyricsOffset(next)
                      if (currentTrack) localStorage.setItem(`lyrics-offset-${currentTrack.filename}`, next.toString())
                    }}
                    title="Lyrics later"
                  >
                    +0.5s
                  </button>
                </div>
              )}
            </div>
            <div className="lyrics-panel" ref={lyricsContainerRef}>
              {lyricsLoading ? (
                <div className="lyrics-loading">Loading lyrics...</div>
              ) : (syncedLyrics.length > 0 ? syncedLyrics : lyrics.map((t) => ({ text: t }))).length > 0 ? (
                (syncedLyrics.length > 0 ? syncedLyrics : lyrics.map((t) => ({ text: t }))).map((line, i) => (
                  <div
                    key={i}
                    className={`lyrics-line ${syncedLyrics.length > 0 && i === activeLyricIndex ? 'active' : ''}`}
                  >
                    {line.text}
                  </div>
                ))
              ) : (
                <div className="lyrics-empty">No lyrics found</div>
              )}
            </div>
          </div>
        </div>

        <div className="full-player-controls">
          <SeekBar value={currentTime} max={duration || 0} onChange={handleSeek} />
          <div className="transport-controls">
            <button className={`ctrl-btn ${shuffle ? 'active' : ''}`} onClick={() => setShuffle((s) => !s)} title="Shuffle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
            </button>
            <button className="ctrl-btn" onClick={onPrev} title="Previous">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>
            <StarBorder as="button" className="ctrl-btn play-btn-star" onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>
              {playing ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </StarBorder>
            <button className="ctrl-btn" onClick={onNext} title="Next">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 18h2V6h-2zM6 18l8.5-6L6 6z" />
              </svg>
            </button>
            <button className={`ctrl-btn ${repeatMode !== 'off' ? 'active' : ''}`} onClick={toggleRepeat} title={`Repeat: ${repeatMode}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              {repeatMode === 'one' && <span className="repeat-one-badge">1</span>}
            </button>
          </div>
          <VolumeBar volume={volume} onChange={handleVolumeChange} />
        </div>
      </div>
    )
  }

  return (
    <div className="music-player-mini">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      <div className="mini-progress" onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const pct = (e.clientX - rect.left) / rect.width
        if (audioRef.current && duration) handleSeek(pct * duration)
      }}>
        <div className="mini-progress-fill" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
      </div>
      <div className="mini-content" onClick={onExpand}>
        <div className="mini-info">
          <div className="mini-track">
            <span className="mini-title">{trackName}</span>
            <span className="mini-artist">{artistName}</span>
          </div>
        </div>
        <div className="mini-controls" onClick={(e) => e.stopPropagation()}>
          <button className="mini-btn" onClick={onPrev}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>
          <button className="mini-btn play" onClick={togglePlay}>
            {playing ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button className="mini-btn" onClick={onNext}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 18h2V6h-2zM6 18l8.5-6L6 6z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
