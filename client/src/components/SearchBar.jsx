import { useState } from 'react'

export default function SearchBar({ onSearch, loading, searchType, onTypeChange }) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <div className="search-input-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder="Search for songs, artists, albums..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
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
    </form>
  )
}
