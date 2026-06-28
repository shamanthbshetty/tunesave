import { useState, useEffect, useCallback } from 'react'
import SearchBar from './components/SearchBar'
import ResultsList from './components/ResultsList'
import DownloadPanel from './components/DownloadPanel'
import PlaylistManager from './components/PlaylistManager'
import Settings from './components/Settings'
import MusicPlayer from './components/MusicPlayer'
import Library from './components/Library'
import Stats, { recordPlay, recordListenTime } from './components/Stats'
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
  const [activeTab, setActiveTab] = useState('search')

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
    if (track.filename) recordPlay(track.filename)
  }

  const handlePlayFromHistory = (track) => {
    const parsed = { filename: track.filename || track.name, name: track.name, artist: track.artist || '', thumbnail: track.thumbnail || '' }
    setCurrentTrack(parsed)
    setQueue([parsed])
    setQueueIndex(0)
    setExpandedPlayer(true)
    if (parsed.filename) recordPlay(parsed.filename)
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

  const handleQueueReorder = (fromIndex, toIndex) => {
    setQueue((prev) => {
      const next = [...prev]
      const [item] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, item)
      return next
    })
    setQueueIndex((prev) => {
      if (fromIndex === prev) return toIndex
      if (fromIndex < prev && toIndex >= prev) return prev - 1
      if (fromIndex > prev && toIndex <= prev) return prev + 1
      return prev
    })
  }

  const handleQueueRemove = (index) => {
    setQueue((prev) => prev.filter((_, i) => i !== index))
    setQueueIndex((prev) => {
      if (index < prev) return prev - 1
      if (index === prev) return prev
      return prev
    })
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
            <nav className="nav-tabs">
              {[
                { id: 'search', label: 'Search', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg> },
                { id: 'library', label: 'Library', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg> },
                { id: 'playlists', label: 'Playlists', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg> },
                { id: 'stats', label: 'Stats', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </header>

          {activeTab === 'search' && (
            <>
              <FadeContent delay={100}>
                <Settings downloadDir={downloadDir} onDirChange={handleDirChange} cacheLyrics={cacheLyrics} onCacheLyricsChange={setCacheLyrics} />
              </FadeContent>

              <SearchBar onSearch={handleSearch} loading={loading} searchType={searchType} onTypeChange={setSearchType} onDownload={handleDownload} isDownloaded={isDownloaded} onPlay={handlePlayFromHistory} />

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
                </aside>
              </main>
            </>
          )}

          {activeTab === 'library' && (
            <Library
              history={history}
              onPlay={handlePlayFromHistory}
              currentTrack={currentTrack}
            />
          )}

          {activeTab === 'playlists' && (
            <div className="playlists-page">
              <PlaylistManager
                playlists={playlists}
                onRefresh={fetchPlaylists}
                onPlayTrack={playTrack}
                currentTrack={currentTrack}
              />
            </div>
          )}

          {activeTab === 'stats' && <Stats />}
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
          onQueueReorder={handleQueueReorder}
          onQueueRemove={handleQueueRemove}
          onPlayFromQueue={(index) => { setQueueIndex(index); setCurrentTrack(queue[index]) }}
          cacheLyrics={cacheLyrics}
          onListenTime={recordListenTime}
        />
      )}
    </div>
  )
}

export default App
