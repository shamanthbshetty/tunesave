import { useState, useEffect, useRef } from 'react'

export default function SearchBar({ onSearch, loading, searchType, onTypeChange, onDownload, isDownloaded, onPlay }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const blurTimeoutRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim() || query.length < 3 || searchType === 'playlist') {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setSuggestLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setSuggestions(data.results || [])
        setShowSuggestions(true)
      } catch {
        setSuggestions([])
      } finally {
        setSuggestLoading(false)
      }
    }, 400)
  }, [query, searchType])

  const handleSubmit = (e) => {
    e.preventDefault()
    setShowSuggestions(false)
    setHighlightIndex(-1)
    onSearch(query)
  }

  const handleSuggestionClick = (item) => {
    setShowSuggestions(false)
    setHighlightIndex(-1)
    if (isDownloaded(item.title)) {
      onPlay({ filename: `${item.title}.mp3`, name: item.title, artist: item.channel, thumbnail: item.thumbnail })
    } else {
      onDownload(item)
    }
    setQuery('')
  }

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setShowSuggestions(false)
      setHighlightIndex(-1)
    }, 200)
  }

  const handleFocus = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    if (suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault()
      handleSuggestionClick(suggestions[highlightIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setHighlightIndex(-1)
    }
  }

  const hasSuggestions = showSuggestions && (suggestions.length > 0 || suggestLoading)

  return (
    <div className="search-bar">
      <div className="search-input-container">
        <form className={`search-input-wrapper ${hasSuggestions ? 'has-suggestions' : ''}`} onSubmit={handleSubmit}>
          <input
            type="text"
            className="search-input"
            placeholder="Search for songs, artists, albums..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHighlightIndex(-1) }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={loading}
            autoComplete="off"
          />
          <button type="submit" className="search-btn" disabled={loading || !query.trim()}>
            {loading ? (
              <span className="spinner" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            )}
          </button>
        </form>
        {hasSuggestions && (
          <div className="search-suggestions">
            {suggestLoading && suggestions.length === 0 && (
              <div className="suggest-loading">
                <span className="spinner" />
              </div>
            )}
            {suggestions.map((item, i) => {
              const downloaded = isDownloaded(item.title)
              return (
                <div
                  key={item.id}
                  className={`search-suggestion-item ${i === highlightIndex ? 'highlighted' : ''}`}
                  onClick={() => handleSuggestionClick(item)}
                  onMouseEnter={() => setHighlightIndex(i)}
                >
                  <img src={item.thumbnail} alt="" className="suggestion-thumb" loading="lazy" />
                  <div className="suggestion-info">
                    <span className="suggestion-title">{item.title}</span>
                    <span className="suggestion-artist">{item.channel}</span>
                  </div>
                  {item.duration && <span className="suggestion-duration">{item.duration}</span>}
                  {downloaded && (
                    <span className="suggestion-downloaded">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div className="search-type-toggle">
        <button
          type="button"
          className={`type-btn ${searchType === 'video' ? 'active' : ''}`}
          onClick={() => onTypeChange('video')}
        >
          Songs
        </button>
        <button
          type="button"
          className={`type-btn ${searchType === 'playlist' ? 'active' : ''}`}
          onClick={() => onTypeChange('playlist')}
        >
          Playlists
        </button>
      </div>
    </div>
  )
}
