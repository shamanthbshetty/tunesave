import { useState, useEffect, useCallback } from 'react'
import SearchBar from './components/SearchBar'
import ResultsList from './components/ResultsList'
import DownloadPanel from './components/DownloadPanel'
import PlaylistManager from './components/PlaylistManager'
import Settings from './components/Settings'
import MusicPlayer from './components/MusicPlayer'
import ShinyText from './components/ShinyText'
import FadeContent from './components/FadeContent'
import './App.css'

function App() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchType, setSearchType] = useState('video')
  const [downloads, setDownloads] = useState([])
  const [error, setError] = useState(null)
  const [downloadDir, setDownloadDir] = useState('')
  const [history, setHistory] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [playlists, setPlaylists] = useState([])
  const [currentTrack, setCurrentTrack] = useState(null)
  const [expandedPlayer, setExpandedPlayer] = useState(false)
  const [queue, setQueue] = useState([])
  const [queueIndex, setQueueIndex] = useState(0)
  const [cacheLyrics, setCacheLyrics] = useState(() => {
    return localStorage.getItem('yt-dl-cache-lyrics') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('yt-dl-cache-lyrics', cacheLyrics.toString())
  }, [cacheLyrics])

  useEffect(() => {
    fetchSettings()
    fetchHistory()
    fetchSuggestions()
    fetchPlaylists()
  }, [])

  useEffect(() => {
    if (history.length > 0) {
      fetchSuggestions()
    }
  }, [history])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      setDownloadDir(data.downloadDir || '')
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/settings/history')
      const data = await res.json()
      setHistory(data.files || [])
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }

  const fetchSuggestions = async () => {
    setSuggestionsLoading(true)
    try {
      const res = await fetch('/api/settings/suggestions')
      const data = await res.json()
      setSuggestions(data.suggestions || [])
    } catch (err) {
      console.error('Failed to load suggestions:', err)
    } finally {
      setSuggestionsLoading(false)
    }
  }

  const fetchPlaylists = async () => {
    try {
      const res = await fetch('/api/playlists')
      const data = await res.json()
      setPlaylists(data.playlists || [])
    } catch (err) {
      console.error('Failed to load playlists:', err)
    }
  }

  const handleDirChange = (newDir) => {
    setDownloadDir(newDir)
    fetchHistory()
  }

  const handleSearch = async (query) => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${searchType}&limit=15`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setResults(data.results || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = useCallback(async (item) => {
    const downloadId = crypto.randomUUID()
    const newDownload = {
      id: downloadId,
      title: item.title,
      channel: item.channel,
      thumbnail: item.thumbnail,
      status: 'starting',
      progress: 0,
      stage: 'starting',
    }

    setDownloads((prev) => [newDownload, ...prev])

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url, title: item.title, thumbnail: item.thumbnail, artist: item.channel }),
      })
      if (!res.ok) throw new Error('Download failed to start')
      const data = await res.json()
      const serverDownloadId = data.downloadId

      const eventSource = new EventSource(`/api/download/progress/${serverDownloadId}`)

      eventSource.onmessage = (event) => {
        const progress = JSON.parse(event.data)
        setDownloads((prev) =>
          prev.map((d) =>
            d.id === downloadId
              ? {
                  ...d,
                  status: progress.stage === 'done' ? 'done' : progress.stage === 'error' ? 'error' : 'downloading',
                  stage: progress.stage,
                  progress: progress.percent || d.progress,
                  filename: progress.filename,
                  error: progress.error,
                }
              : d
          )
        )

        if (progress.stage === 'done') {
          eventSource.close()
          fetchHistory()
        } else if (progress.stage === 'error') {
          eventSource.close()
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
      }
    } catch (err) {
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === downloadId ? { ...d, status: 'error', error: err.message } : d
        )
      )
    }
  }, [])

  const handleDownloadAll = useCallback(async (playlistVideos) => {
    const MAX_CONCURRENT = 3
    const queue = [...playlistVideos]
    const active = []

    const startNext = () => {
      if (queue.length === 0) return null
      const video = queue.shift()
      const promise = handleDownload(video).then(() => {
        active.splice(active.indexOf(promise), 1)
        if (active.length < MAX_CONCURRENT && queue.length > 0) {
          const next = startNext()
          if (next) active.push(next)
        }
      })
      return promise
    }

    for (let i = 0; i < Math.min(MAX_CONCURRENT, queue.length); i++) {
      const p = startNext()
      if (p) active.push(p)
    }

    await Promise.all(active)
  }, [handleDownload])

  const removeDownload = (id) => {
    setDownloads((prev) => prev.filter((d) => d.id !== id))
  }

  const isDownloaded = (title) => {
    const safeName = title
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200)
    return history.some((f) => f.name === `${safeName}.mp3`)
  }

  const playTrack = (track, trackQueue, index) => {
    setCurrentTrack(track)
    if (trackQueue && index !== undefined) {
      setQueue(trackQueue)
      setQueueIndex(index)
    }
    setExpandedPlayer(true)
  }

  const handlePlayFromHistory = (track) => {
    const parsed = { filename: track.filename || track.name, name: track.name, artist: track.artist || '', thumbnail: track.thumbnail || '' }
    setCurrentTrack(parsed)
    setQueue([parsed])
    setQueueIndex(0)
    setExpandedPlayer(true)
  }

  const handleNextTrack = () => {
    if (queue.length === 0) return
    const nextIdx = queueIndex + 1
    if (nextIdx < queue.length) {
      setQueueIndex(nextIdx)
      setCurrentTrack(queue[nextIdx])
    }
  }

  const handlePrevTrack = () => {
    if (queue.length === 0) return
    const prevIdx = queueIndex - 1
    if (prevIdx >= 0) {
      setQueueIndex(prevIdx)
      setCurrentTrack(queue[prevIdx])
    }
  }

  const handleShuffleNext = () => {
    if (queue.length <= 1) return
    let nextIdx
    do {
      nextIdx = Math.floor(Math.random() * queue.length)
    } while (nextIdx === queueIndex && queue.length > 1)
    setQueueIndex(nextIdx)
    setCurrentTrack(queue[nextIdx])
  }

  const handleAddToPlaylist = async (playlistId, track) => {
    try {
      await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(track),
      })
      fetchPlaylists()
    } catch (err) {
      console.error('Failed to add to playlist:', err)
    }
  }

  return (
    <div className={`app ${currentTrack ? 'has-player' : ''}`}>
      {!expandedPlayer && (
        <>
          <header className="app-header">
            <div className="app-logo-row">
              <img src="/favicon.svg" alt="" className="app-logo" />
              <h1>
                <ShinyText text="TuneSave" shineColor="#a78bfa" speed={3} />
              </h1>
            </div>
            <p className="subtitle">Search, choose, download</p>
          </header>

          <FadeContent delay={100}>
            <Settings downloadDir={downloadDir} onDirChange={handleDirChange} cacheLyrics={cacheLyrics} onCacheLyricsChange={setCacheLyrics} />
          </FadeContent>

          <FadeContent delay={200}>
            <SearchBar onSearch={handleSearch} loading={loading} searchType={searchType} onTypeChange={setSearchType} />
          </FadeContent>

          {error && (
            <div className="error-banner">
              {error}
              <button className="error-dismiss" onClick={() => setError(null)} title="Dismiss">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          <main className="main-content">
            <div className="results-section">
              <ResultsList
                results={results}
                loading={loading}
                onDownload={handleDownload}
                onDownloadAll={handleDownloadAll}
                searchType={searchType}
                isDownloaded={isDownloaded}
                suggestions={suggestions}
                suggestionsLoading={suggestionsLoading}
              />
            </div>

            <aside className="downloads-section">
              <DownloadPanel
                downloads={downloads}
                onRemove={removeDownload}
                history={history}
                onPlay={handlePlayFromHistory}
                currentTrack={currentTrack}
                playlists={playlists}
                onAddToPlaylist={handleAddToPlaylist}
              />
              <PlaylistManager
                playlists={playlists}
                onRefresh={fetchPlaylists}
                onPlayTrack={playTrack}
                currentTrack={currentTrack}
              />
            </aside>
          </main>
        </>
      )}

      {currentTrack && (
        <MusicPlayer
          currentTrack={currentTrack}
          expanded={expandedPlayer}
          onCollapse={() => setExpandedPlayer(false)}
          onExpand={() => setExpandedPlayer(true)}
          queue={queue}
          queueIndex={queueIndex}
          onNext={handleNextTrack}
          onPrev={handlePrevTrack}
          onShuffleNext={handleShuffleNext}
          cacheLyrics={cacheLyrics}
        />
      )}
    </div>
  )
}

export default App
