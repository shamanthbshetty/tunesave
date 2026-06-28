import { useState, useEffect, useRef, useCallback } from 'react'
import useThumbnail from '../hooks/useThumbnail'

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

function SeekBar({ value, max, onChange, playing }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const phaseRef = useRef(0)
  const rafRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const amplitude = 7
  const frequency = 0.08
  const speed = 0.12
  const taperZone = 45
  const lineWidth = 3
  const knobRadius = 6

  const getValueFromEvent = (e) => {
    if (!containerRef.current || !max) return 0
    const rect = containerRef.current.getBoundingClientRect()
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

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.parentElement.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
  }, [])

  const drawWave = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rect = canvas.parentElement.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const centerY = height / 2

    if (width === 0 || height === 0) return

    ctx.clearRect(0, 0, width, height)

    const pct = max ? value / max : 0
    const progressX = pct * width

    if (playing) {
      phaseRef.current += speed
    }

    ctx.beginPath()
    ctx.moveTo(progressX, centerY)
    ctx.lineTo(width, centerY)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.stroke()

    if (progressX > 0) {
      ctx.beginPath()
      let started = false
      for (let x = 0; x <= progressX; x++) {
        const dStart = Math.min(1, x / 15)
        const dEnd = Math.max(0, Math.min(1, (progressX - x) / taperZone))
        const dampFactor = dStart * dEnd
        const wave = Math.sin(x * frequency - phaseRef.current)
        const y = centerY + wave * amplitude * dampFactor
        if (!started) { ctx.moveTo(x, y); started = true } else { ctx.lineTo(x, y) }
      }
      ctx.strokeStyle = '#e8e8e8'
      ctx.lineWidth = lineWidth
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.stroke()
    }

    if (pct > 0) {
      ctx.beginPath()
      ctx.arc(progressX, centerY, knobRadius, 0, Math.PI * 2)
      ctx.fillStyle = '#e8e8e8'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
      ctx.shadowBlur = 8
      ctx.shadowOffsetY = 2
      ctx.fill()
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetY = 0
    }
  }, [value, max, playing, amplitude, frequency, speed, taperZone, lineWidth, knobRadius])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  useEffect(() => {
    const animate = () => {
      drawWave()
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [drawWave])

  return (
    <div className="seek-row">
      <span className="time-text">{formatTime(value)}</span>
      <div
        ref={containerRef}
        className="seek-bar"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <canvas ref={canvasRef} className="seek-canvas" />
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

function QueuePanel({ queue, queueIndex, onPlayFromQueue, onReorder, onRemove }) {
  const dragItem = useRef(null)
  const dragOverItem = useRef(null)

  const handleDragStart = (e, index) => {
    dragItem.current = index
    e.currentTarget.classList.add('queue-item--dragging')
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnter = (e, index) => {
    dragOverItem.current = index
    const items = e.currentTarget.parentElement.querySelectorAll('.queue-item')
    items.forEach((item) => item.classList.remove('queue-item--drag-over'))
    e.currentTarget.classList.add('queue-item--drag-over')
  }

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('queue-item--dragging')
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      onReorder(dragItem.current, dragOverItem.current)
    }
    dragItem.current = null
    dragOverItem.current = null
    const items = e.currentTarget.parentElement?.querySelectorAll('.queue-item')
    items?.forEach((item) => {
      item.classList.remove('queue-item--drag-over')
      item.classList.remove('queue-item--dragging')
    })
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  return (
    <div className="queue-panel">
      {queue.length === 0 ? (
        <div className="queue-empty">Queue is empty</div>
      ) : (
        queue.map((track, i) => (
          <div
            key={`${track.filename}-${i}`}
            className={`queue-item ${i === queueIndex ? 'queue-item--active' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, i)}
            onDragEnter={(e) => handleDragEnter(e, i)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onClick={() => onPlayFromQueue(i)}
          >
            <span className="queue-item-drag">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="8" cy="6" r="1.5" /><circle cx="16" cy="6" r="1.5" />
                <circle cx="8" cy="12" r="1.5" /><circle cx="16" cy="12" r="1.5" />
                <circle cx="8" cy="18" r="1.5" /><circle cx="16" cy="18" r="1.5" />
              </svg>
            </span>
            <div className="queue-item-info">
              <span className="queue-item-title">{track.name || 'Unknown'}</span>
              {track.artist && <span className="queue-item-artist">{track.artist}</span>}
            </div>
            <button className="queue-item-remove" onClick={(e) => { e.stopPropagation(); onRemove(i) }} title="Remove">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))
      )}
    </div>
  )
}

function Equalizer({ eqRef }) {
  const [bands, setBands] = useState(() => {
    const saved = localStorage.getItem('yt-dl-eq')
    return saved ? JSON.parse(saved) : { bass: 0, mid: 0, treble: 0 }
  })

  const updateBand = (band, value) => {
    const next = { ...bands, [band]: value }
    setBands(next)
    localStorage.setItem('yt-dl-eq', JSON.stringify(next))
    if (eqRef.current?.[band]) {
      eqRef.current[band].gain.value = value
    }
  }

  const resetAll = () => {
    const defaults = { bass: 0, mid: 0, treble: 0 }
    setBands(defaults)
    localStorage.setItem('yt-dl-eq', JSON.stringify(defaults))
    if (eqRef.current) {
      eqRef.current.bass.gain.value = 0
      eqRef.current.mid.gain.value = 0
      eqRef.current.treble.gain.value = 0
    }
  }

  return (
    <div className="equalizer">
      <div className="eq-header">
        <span>Equalizer</span>
        <button className="eq-reset-btn" onClick={resetAll}>Reset</button>
      </div>
      {[
        { key: 'bass', label: 'Bass', freq: '100 Hz' },
        { key: 'mid', label: 'Mid', freq: '1 kHz' },
        { key: 'treble', label: 'Treble', freq: '8 kHz' },
      ].map(({ key, label, freq }) => (
        <div className="eq-band" key={key}>
          <span className="eq-value">{bands[key] > 0 ? '+' : ''}{bands[key]} dB</span>
          <input
            type="range"
            className="eq-slider"
            min="-12"
            max="12"
            step="1"
            value={bands[key]}
            onChange={(e) => updateBand(key, parseInt(e.target.value))}
          />
          <span className="eq-label">{label}</span>
          <span className="eq-freq">{freq}</span>
        </div>
      ))}
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
  onQueueReorder,
  onQueueRemove,
  onPlayFromQueue,
  cacheLyrics,
  onListenTime,
}) {
  const audioRef = useRef(null)
  const audioRef2 = useRef(null)
  const audioCtxRef = useRef(null)
  const source1Ref = useRef(null)
  const source2Ref = useRef(null)
  const eqFiltersRef = useRef(null)
  const masterGainRef = useRef(null)
  const crossfadeGain1Ref = useRef(null)
  const crossfadeGain2Ref = useRef(null)
  const activeAudioRef = useRef(1)
  const crossfadingRef = useRef(false)
  const crossfadeTimerRef = useRef(null)

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
  const [dynamicColor, setDynamicColor] = useState(null)
  const [overlayPanel, setOverlayPanel] = useState(null)
  const [crossfadeDuration, setCrossfadeDuration] = useState(() => {
    const saved = localStorage.getItem('yt-dl-crossfade')
    return saved !== null ? parseFloat(saved) : 0
  })
  const [eqEnabled, setEqEnabled] = useState(() => {
    return localStorage.getItem('yt-dl-eq-enabled') === 'true'
  })
  const eqRef = useRef({ bass: null, mid: null, treble: null })

  const getActiveAudio = () => activeAudioRef.current === 1 ? audioRef.current : audioRef2.current
  const getInactiveAudio = () => activeAudioRef.current === 1 ? audioRef2.current : audioRef.current
  const getCrossfadeGains = () => activeAudioRef.current === 1
    ? { out: crossfadeGain1Ref.current, in: crossfadeGain2Ref.current }
    : { out: crossfadeGain2Ref.current, in: crossfadeGain1Ref.current }

  const initAudioContext = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current
    const ctx = new (window.AudioContext || window.webkitAudioContext)()

    const source1 = ctx.createMediaElementSource(audioRef.current)
    const source2 = ctx.createMediaElementSource(audioRef2.current)

    const crossfadeGain1 = ctx.createGain()
    const crossfadeGain2 = ctx.createGain()
    crossfadeGain1.gain.value = 1
    crossfadeGain2.gain.value = 0

    const bass = ctx.createBiquadFilter()
    bass.type = 'lowshelf'
    bass.frequency.value = 100
    bass.gain.value = 0

    const mid = ctx.createBiquadFilter()
    mid.type = 'peaking'
    mid.frequency.value = 1000
    mid.Q.value = 0.7
    mid.gain.value = 0

    const treble = ctx.createBiquadFilter()
    treble.type = 'highshelf'
    treble.frequency.value = 8000
    treble.gain.value = 0

    const masterGain = ctx.createGain()
    masterGain.gain.value = 1

    source1.connect(crossfadeGain1).connect(bass).connect(mid).connect(treble).connect(masterGain).connect(ctx.destination)
    source2.connect(crossfadeGain2).connect(bass)

    audioCtxRef.current = ctx
    source1Ref.current = source1
    source2Ref.current = source2
    crossfadeGain1Ref.current = crossfadeGain1
    crossfadeGain2Ref.current = crossfadeGain2
    eqFiltersRef.current = { bass, mid, treble }
    masterGainRef.current = masterGain
    eqRef.current = { bass, mid, treble }

    const savedEq = localStorage.getItem('yt-dl-eq')
    if (savedEq) {
      const eq = JSON.parse(savedEq)
      bass.gain.value = eq.bass || 0
      mid.gain.value = eq.mid || 0
      treble.gain.value = eq.treble || 0
    }

    return ctx
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('yt-dl-crossfade')
    if (saved !== null) setCrossfadeDuration(parseFloat(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('yt-dl-crossfade', crossfadeDuration.toString())
  }, [crossfadeDuration])

  useEffect(() => {
    localStorage.setItem('yt-dl-eq-enabled', eqEnabled.toString())
    if (eqFiltersRef.current) {
      const gain = eqEnabled ? 1 : 0
      const saved = localStorage.getItem('yt-dl-eq')
      const eq = saved ? JSON.parse(saved) : { bass: 0, mid: 0, treble: 0 }
      eqFiltersRef.current.bass.gain.value = eqEnabled ? eq.bass : 0
      eqFiltersRef.current.mid.gain.value = eqEnabled ? eq.mid : 0
      eqFiltersRef.current.treble.gain.value = eqEnabled ? eq.treble : 0
    }
  }, [eqEnabled])

  useEffect(() => {
    if (!audioRef.current || !audioRef2.current) return
    const audios = [audioRef.current, audioRef2.current]
    const tryInit = () => {
      if (!audioCtxRef.current) {
        initAudioContext()
      }
      audios.forEach((a) => {
        a.onplay = () => {
          if (audioCtxRef.current?.state === 'suspended') {
            audioCtxRef.current.resume()
          }
        }
      })
    }
    tryInit()
    audios.forEach((a) => a.addEventListener('play', tryInit))
    return () => audios.forEach((a) => a.removeEventListener('play', tryInit))
  }, [initAudioContext])

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.volume = volume
    localStorage.setItem('yt-dl-volume', volume.toString())
  }, [volume])

  useEffect(() => {
    const audio = getActiveAudio()
    if (!audio || !currentTrack) return
    audio.src = `/api/download/play/${encodeURIComponent(currentTrack.filename)}`
    audio.load()
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    setCurrentTime(0)
    setDuration(0)
    setLyrics([])
    setSyncedLyrics([])
    setActiveLyricIndex(-1)
    if (crossfadeTimerRef.current) {
      clearTimeout(crossfadeTimerRef.current)
      crossfadeTimerRef.current = null
    }
    crossfadingRef.current = false
  }, [currentTrack?.filename])

  useEffect(() => {
    const audio = getActiveAudio()
    if (!audio) return
    if (playing) {
      audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }, [playing])

  const startCrossfade = useCallback(() => {
    if (crossfadingRef.current || crossfadeDuration <= 0) return
    if (queueIndex >= queue.length - 1 && repeatMode === 'off') return

    crossfadingRef.current = true
    const { out, in: fadeIn } = getCrossfadeGains()
    const nextAudio = getInactiveAudio()
    const ctx = audioCtxRef.current

    let nextTrack
    if (repeatMode === 'one') {
      nextTrack = currentTrack
    } else if (shuffle) {
      let idx
      do { idx = Math.floor(Math.random() * queue.length) } while (idx === queueIndex && queue.length > 1)
      nextTrack = queue[idx]
    } else {
      const nextIdx = queueIndex + 1
      nextTrack = queue[nextIdx]
    }

    if (!nextTrack) { crossfadingRef.current = false; return }

    nextAudio.src = `/api/download/play/${encodeURIComponent(nextTrack.filename)}`
    nextAudio.load()
    nextAudio.play().catch(() => {})

    if (ctx) {
      const now = ctx.currentTime
      out.gain.setValueAtTime(out.gain.value, now)
      out.gain.linearRampToValueAtTime(0, now + crossfadeDuration)
      fadeIn.gain.setValueAtTime(fadeIn.gain.value, now)
      fadeIn.gain.linearRampToValueAtTime(1, now + crossfadeDuration)
    }

    crossfadeTimerRef.current = setTimeout(() => {
      activeAudioRef.current = activeAudioRef.current === 1 ? 2 : 1
      setCurrentTrack(nextTrack)
      if (!shuffle) {
        const nextIdx = queueIndex + 1
        if (nextIdx < queue.length) {
          onPlayFromQueue(nextIdx)
        }
      }
      crossfadingRef.current = false
    }, crossfadeDuration * 1000)
  }, [crossfadeDuration, queueIndex, queue, repeatMode, shuffle, currentTrack, onPlayFromQueue])

  useEffect(() => {
    return () => {
      if (crossfadeTimerRef.current) clearTimeout(crossfadeTimerRef.current)
    }
  }, [])

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

  useEffect(() => {
    if (!playing || !currentTrack?.filename || !onListenTime) return
    const interval = setInterval(() => {
      onListenTime(currentTrack.filename, 5)
    }, 5000)
    return () => clearInterval(interval)
  }, [playing, currentTrack?.filename, onListenTime])

  const trackName = currentTrack?.name || 'No track'
  const artistName = currentTrack?.artist || ''
  const { thumbnail: fetchedThumbnail, loading: thumbnailLoading } = useThumbnail(trackName, artistName)
  const thumbnail = currentTrack?.thumbnail || fetchedThumbnail || ''

  useEffect(() => {
    if (!thumbnail) {
      setDynamicColor(null)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = thumbnail
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const size = 10
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, size, size)
        const data = ctx.getImageData(0, 0, size, size).data
        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < data.length; i += 16) {
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          count++
        }
        r = Math.round(r / count)
        g = Math.round(g / count)
        b = Math.round(b / count)
        setDynamicColor(`rgb(${r}, ${g}, ${b})`)
      } catch {
        setDynamicColor(null)
      }
    }
    img.onerror = () => setDynamicColor(null)
  }, [thumbnail])

  const handleTimeUpdate = useCallback(() => {
    const audio = getActiveAudio()
    if (audio) {
      setCurrentTime(audio.currentTime)
      if (crossfadeDuration > 0 && duration > 0 && !crossfadingRef.current) {
        if (audio.currentTime >= duration - crossfadeDuration) {
          startCrossfade()
        }
      }
    }
  }, [duration, crossfadeDuration, startCrossfade])

  const handleLoadedMetadata = useCallback(() => {
    const audio = getActiveAudio()
    if (audio) setDuration(audio.duration)
  }, [])

  const handleEnded = useCallback(() => {
    if (crossfadingRef.current) return
    if (repeatMode === 'one') {
      const audio = getActiveAudio()
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
    const audio = getActiveAudio()
    if (!audio || !duration) return
    audio.currentTime = val
    setCurrentTime(val)
  }

  const toggleRepeat = () => {
    setRepeatMode((m) => m === 'off' ? 'all' : m === 'all' ? 'one' : 'off')
  }

  const handleVolumeChange = (val) => {
    setVolume(val / 100)
    const audio = getActiveAudio()
    if (audio) audio.volume = val / 100
  }

  const handleKey = useCallback((e) => {
    if (e.target.tagName === 'INPUT') return
    if (e.code === 'Space') { e.preventDefault(); togglePlay() }
    if (e.code === 'ArrowRight') { e.preventDefault(); const a = getActiveAudio(); if (a) a.currentTime = Math.min(duration, a.currentTime + 5) }
    if (e.code === 'ArrowLeft') { e.preventDefault(); const a = getActiveAudio(); if (a) a.currentTime = Math.max(0, a.currentTime - 5) }
    if (e.code === 'ArrowUp') { e.preventDefault(); setVolume((v) => { const nv = Math.min(1, v + 0.1); const a = getActiveAudio(); if (a) a.volume = nv; return nv }) }
    if (e.code === 'ArrowDown') { e.preventDefault(); setVolume((v) => { const nv = Math.max(0, v - 0.1); const a = getActiveAudio(); if (a) a.volume = nv; return nv }) }
  }, [duration])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  useEffect(() => {
    const a = getActiveAudio()
    if (a) a.volume = volume
  }, [])

  const onBothTimeUpdate = handleTimeUpdate
  const onBothLoadedMetadata = handleLoadedMetadata
  const onBothEnded = handleEnded

  if (!currentTrack) return (<><audio ref={audioRef} /><audio ref={audioRef2} /></>)

  if (expanded) {
    return (
      <div className="music-player-full" style={dynamicColor ? { '--dynamic-accent': dynamicColor, background: `linear-gradient(180deg, ${dynamicColor}44 0%, ${dynamicColor}11 40%, var(--bg-primary) 100%)` } : undefined}>
        <audio ref={audioRef} onTimeUpdate={onBothTimeUpdate} onLoadedMetadata={onBothLoadedMetadata} onEnded={onBothEnded} />
        <audio ref={audioRef2} onTimeUpdate={onBothTimeUpdate} onLoadedMetadata={onBothLoadedMetadata} onEnded={onBothEnded} />

        <div className="np-header">
          <button className="np-header-btn" onClick={onCollapse} title="Minimize" aria-label="Minimize player">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="np-header-center">
            {playing && <span className="np-ping-dot" />}
            <span className="np-header-title">Now Playing</span>
          </div>
          <div className="np-header-actions">
            <button className={`np-header-btn ${overlayPanel === 'queue' ? 'active' : ''}`} onClick={() => setOverlayPanel(overlayPanel === 'queue' ? null : 'queue')} title="Queue" aria-label="Toggle queue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="6" y1="6" x2="19" y2="6" /><line x1="6" y1="12" x2="19" y2="12" /><line x1="6" y1="18" x2="19" y2="18" />
                <line x1="1" y1="6" x2="1.01" y2="6" /><line x1="1" y1="12" x2="1.01" y2="12" /><line x1="1" y1="18" x2="1.01" y2="18" />
              </svg>
            </button>
            <button className={`np-header-btn ${overlayPanel === 'eq' ? 'active' : ''}`} onClick={() => setOverlayPanel(overlayPanel === 'eq' ? null : 'eq')} title="Equalizer" aria-label="Toggle equalizer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                <circle cx="4" cy="12" r="2" /><circle cx="12" cy="10" r="2" /><circle cx="20" cy="14" r="2" />
              </svg>
            </button>
          </div>
        </div>

        <div className="np-content">
          <div className="np-album-art">
            {thumbnailLoading && !thumbnail ? (
              <div className="skeleton-album" />
            ) : thumbnail ? (
              <img src={thumbnail} alt="" className={`album-art-img ${playing ? 'playing' : ''}`} />
            ) : (
              <div className="album-art-placeholder">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
            )}
          </div>
          <div className="np-lyrics-column">
            <div className="np-lyrics-header">
              <span className="np-lyrics-label">Lyrics</span>
              {syncedLyrics.length > 0 && (
                <div className="lyrics-offset-controls">
                  <button className="lyrics-offset-btn" onClick={() => { const next = Math.round((lyricsOffset - 0.5) * 10) / 10; setLyricsOffset(next); if (currentTrack) localStorage.setItem(`lyrics-offset-${currentTrack.filename}`, next.toString()) }} title="Lyrics earlier">−0.5s</button>
                  {lyricsOffset !== 0 && <span className="lyrics-offset-value">{lyricsOffset > 0 ? '+' : ''}{lyricsOffset}s</span>}
                  <button className="lyrics-offset-btn" onClick={() => { const next = Math.round((lyricsOffset + 0.5) * 10) / 10; setLyricsOffset(next); if (currentTrack) localStorage.setItem(`lyrics-offset-${currentTrack.filename}`, next.toString()) }} title="Lyrics later">+0.5s</button>
                </div>
              )}
            </div>
            <div className="np-lyrics-body" ref={lyricsContainerRef}>
              {lyricsLoading ? (
                <div className="lyrics-loading">Loading lyrics...</div>
              ) : (syncedLyrics.length > 0 ? syncedLyrics : lyrics.map((t) => ({ text: t }))).length > 0 ? (
                (syncedLyrics.length > 0 ? syncedLyrics : lyrics.map((t) => ({ text: t }))).map((line, i) => (
                  <div
                    key={i}
                    className={`lyrics-line ${syncedLyrics.length > 0 && i === activeLyricIndex ? 'active' : ''} ${line.time != null ? 'synced' : ''}`}
                    onClick={() => { if (line.time != null) handleSeek(line.time) }}
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

        <div className="np-info">
          <div className="np-info-row">
            {thumbnail && (
              <div className="np-info-thumb">
                <img src={thumbnail} alt="" />
              </div>
            )}
            <div className="np-info-text">
              <h2 className="np-title">{trackName}</h2>
              {artistName && <span className="np-artist">{artistName}</span>}
            </div>
          </div>
        </div>

        <div className="np-controls">
          <div className="np-seek-card">
            <SeekBar value={currentTime} max={duration || 0} onChange={handleSeek} playing={playing} />
          </div>
          <div className="transport-controls">
            <button className={`ctrl-btn ${shuffle ? 'active' : ''}`} onClick={() => setShuffle((s) => !s)} title="Shuffle" aria-label="Toggle shuffle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
            </button>
            <button className="ctrl-btn" onClick={onPrev} title="Previous" aria-label="Previous track">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>
            <button className="ctrl-btn play-btn" onClick={togglePlay} title={playing ? 'Pause' : 'Play'} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button className="ctrl-btn" onClick={onNext} title="Next" aria-label="Next track">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 18h2V6h-2zM6 18l8.5-6L6 6z" />
              </svg>
            </button>
            <button className={`ctrl-btn ${repeatMode !== 'off' ? 'active' : ''}`} onClick={toggleRepeat} title={`Repeat: ${repeatMode}`} aria-label={`Repeat: ${repeatMode}`}>
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

        {overlayPanel && (
          <div className="np-overlay" onClick={() => setOverlayPanel(null)}>
            <div className="np-overlay-panel" onClick={(e) => e.stopPropagation()}>
              <div className="np-overlay-header">
                <button className="np-overlay-close" onClick={() => setOverlayPanel(null)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <span className="np-overlay-title">{overlayPanel === 'queue' ? 'Queue' : 'Equalizer'}</span>
                <div style={{ width: 32 }} />
              </div>
              <div className="np-overlay-content">
                {overlayPanel === 'queue' && (
                  <QueuePanel queue={queue} queueIndex={queueIndex} onPlayFromQueue={onPlayFromQueue} onReorder={onQueueReorder} onRemove={onQueueRemove} />
                )}
                {overlayPanel === 'eq' && (
                  <>
                    <div className="eq-controls-top">
                      <label className="eq-toggle">
                        <input type="checkbox" checked={eqEnabled} onChange={(e) => setEqEnabled(e.target.checked)} />
                        <span>Equalizer</span>
                      </label>
                      <div className="crossfade-control">
                        <span>Crossfade</span>
                        <select className="crossfade-select" value={crossfadeDuration} onChange={(e) => setCrossfadeDuration(parseFloat(e.target.value))}>
                          <option value={0}>Off</option>
                          <option value={2}>2s</option>
                          <option value={4}>4s</option>
                          <option value={6}>6s</option>
                          <option value={8}>8s</option>
                          <option value={10}>10s</option>
                        </select>
                      </div>
                    </div>
                    <Equalizer eqRef={eqRef} />
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="music-player-mini" style={dynamicColor ? { borderTopColor: `${dynamicColor}44` } : undefined}>
      <audio ref={audioRef} onTimeUpdate={onBothTimeUpdate} onLoadedMetadata={onBothLoadedMetadata} onEnded={onBothEnded} />
      <audio ref={audioRef2} onTimeUpdate={onBothTimeUpdate} onLoadedMetadata={onBothLoadedMetadata} onEnded={onBothEnded} />
      <div className="mini-progress" onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const pct = (e.clientX - rect.left) / rect.width
        if (duration) handleSeek(pct * duration)
      }}>
        <div className="mini-progress-fill" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
      </div>
      <div className="mini-content" onClick={onExpand}>
        {(thumbnail || thumbnailLoading) && (
          <div className="mini-album-art">
            {thumbnailLoading && !thumbnail ? (
              <div className="skeleton-album" />
            ) : (
              <img src={thumbnail} alt="" />
            )}
          </div>
        )}
        <div className="mini-info">
          <div className="mini-track">
            <span className="mini-title">{trackName}</span>
            <span className="mini-artist">{artistName}</span>
          </div>
        </div>
        <div className="mini-controls" onClick={(e) => e.stopPropagation()}>
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
