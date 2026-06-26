import { useState, useEffect } from 'react'

export default function Settings({ downloadDir, onDirChange }) {
  const [editing, setEditing] = useState(false)
  const [drives, setDrives] = useState([])
  const [currentPath, setCurrentPath] = useState('')
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (editing && drives.length === 0) {
      fetchDrives()
    }
  }, [editing])

  useEffect(() => {
    if (currentPath) {
      browsePath(currentPath)
    }
  }, [currentPath])

  const fetchDrives = async () => {
    try {
      const res = await fetch('/api/settings/drives')
      const data = await res.json()
      setDrives(data.drives || [])
      if (data.drives?.length > 0) {
        setCurrentPath(data.drives[0].name)
      }
    } catch (err) {
      setError('Failed to load drives')
    }
  }

  const browsePath = async (p) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/settings/browse?path=${encodeURIComponent(p)}`)
      const data = await res.json()
      setFolders(data.folders || [])
      if (data.error) setError(data.error)
    } catch (err) {
      setError('Failed to browse directory')
    } finally {
      setLoading(false)
    }
  }

  const navigateUp = () => {
    const parts = currentPath.replace(/[\\/]+$/, '').split(/[\\/]/)
    if (parts.length > 1) {
      const isDrive = /^[A-Z]:\\?$/i.test(currentPath.trim())
      if (isDrive) return
      parts.pop()
      let parent = parts.join('\\')
      if (/^[A-Z]:$/i.test(parent)) parent += '\\'
      setCurrentPath(parent)
    }
  }

  const handleSelect = async () => {
    setError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ downloadDir: currentPath }),
      })
      const data = await res.json()
      if (data.success) {
        onDirChange(data.downloadDir)
        setEditing(false)
      } else {
        setError(data.error || 'Failed to save')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const displayPath = downloadDir || 'Not set'

  if (!editing) {
    return (
      <div className="settings-bar">
        <div className="settings-info">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span className="settings-label">Downloads to:</span>
          <span className="settings-path" title={downloadDir}>{displayPath}</span>
        </div>
        <button className="settings-change-btn" onClick={() => setEditing(true)}>
          Change Folder
        </button>
      </div>
    )
  }

  return (
    <div className="folder-browser">
      <div className="folder-browser-header">
        <span className="folder-browser-title">Select Download Folder</span>
        <button className="folder-browser-close" onClick={() => { setEditing(false); setError(null) }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="folder-browser-current">
        <span className="folder-browser-path">{currentPath || 'Select a drive...'}</span>
        <button
          className="folder-nav-btn"
          onClick={navigateUp}
          disabled={!currentPath || /^[A-Z]:\\?$/i.test(currentPath.trim())}
          title="Go up"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      </div>

      {error && <div className="folder-browser-error">{error}</div>}

      <div className="folder-browser-body">
        <div className="folder-drives">
          <div className="folder-section-label">Drives</div>
          {drives.map((drive) => (
            <button
              key={drive.name}
              className={`folder-drive-item ${currentPath === drive.name ? 'active' : ''}`}
              onClick={() => setCurrentPath(drive.name)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.01M10 8h.01" />
              </svg>
              <span className="drive-label">{drive.label}</span>
              <span className="drive-name">{drive.name}</span>
            </button>
          ))}
        </div>

        <div className="folder-list">
          <div className="folder-section-label">Folders</div>
          {loading ? (
            <div className="folder-loading">Loading...</div>
          ) : folders.length === 0 ? (
            <div className="folder-empty">No subfolders</div>
          ) : (
            <div className="folder-scroll">
              {folders.map((folder) => (
                <button
                  key={folder}
                  className="folder-item"
                  onClick={() => setCurrentPath(currentPath.replace(/[\\/]+$/, '') + '\\' + folder)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  {folder}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="folder-browser-footer">
        <button className="folder-select-btn" onClick={handleSelect} disabled={!currentPath}>
          Select This Folder
        </button>
      </div>
    </div>
  )
}
