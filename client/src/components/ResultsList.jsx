import ResultCard from './ResultCard'
import PlaylistCard from './PlaylistCard'

export default function ResultsList({ results, loading, onDownload, onDownloadAll, searchType, isDownloaded, suggestions, suggestionsLoading }) {
  const suggestionsSection = suggestions.length > 0 && (
    <div className="suggestions-section">
      <h2 className="suggestions-heading">You Might Like</h2>
      <div className="results-grid">
        {suggestions.map((s) => (
          <ResultCard key={s.id} item={s} onDownload={onDownload} />
        ))}
      </div>
    </div>
  )

  const loadingSection = suggestionsLoading && suggestions.length === 0 && (
    <div className="suggestions-section">
      <h2 className="suggestions-heading">You Might Like</h2>
      <div className="loading-grid">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-thumb" />
            <div className="skeleton-text" />
            <div className="skeleton-text short" />
          </div>
        ))}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="results-loading">
        <div className="loading-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-thumb" />
              <div className="skeleton-text" />
              <div className="skeleton-text short" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="results-empty">
        <div className="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <p>Search for your favorite songs</p>
        {suggestionsSection}
        {loadingSection}
      </div>
    )
  }

  return (
    <div className="results-list">
      <div className="results-count">{results.length} result{results.length !== 1 ? 's' : ''}</div>
      <div className="results-grid">
        {results.map((item) =>
          searchType === 'playlist' ? (
            <PlaylistCard key={item.id} item={item} onDownloadAll={onDownloadAll} />
          ) : (
            <ResultCard key={item.id} item={item} onDownload={onDownload} isDownloaded={isDownloaded?.(item.title)} />
          )
        )}
      </div>

      {suggestionsSection}
      {loadingSection}
    </div>
  )
}
