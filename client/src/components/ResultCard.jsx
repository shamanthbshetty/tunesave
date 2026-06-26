import { useState } from 'react'
import SpotlightCard from './SpotlightCard'

export default function ResultCard({ item, onDownload, isDownloaded }) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    onDownload(item)
    setTimeout(() => setDownloading(false), 2000)
  }

  return (
    <SpotlightCard className="result-card" spotlightSize={250}>
      <div className="result-thumb-wrapper">
        <img
          src={item.thumbnail}
          alt={item.title}
          className="result-thumb"
          loading="lazy"
          onError={(e) => {
            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><rect fill="%23222" width="160" height="90"/><text fill="%23555" x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="14">No thumbnail</text></svg>'
          }}
        />
        {item.duration && <span className="result-duration">{item.duration}</span>}
        {isDownloaded && (
          <span className="result-downloaded-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Downloaded
          </span>
        )}
      </div>
      <div className="result-info">
        <h3 className="result-title" title={item.title}>{item.title}</h3>
        <p className="result-channel">{item.channel}</p>
        {item.views && <p className="result-views">{item.views}</p>}
        <button
          className={`download-btn ${downloading ? 'downloading' : ''} ${isDownloaded ? 'downloaded' : ''}`}
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <>
              <span className="btn-spinner" />
              Queued
            </>
          ) : isDownloaded ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Downloaded
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download MP3
            </>
          )}
        </button>
      </div>
    </SpotlightCard>
  )
}
