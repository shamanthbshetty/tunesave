import { useState, useEffect } from 'react'

const cache = new Map()

function buildQuery(title, artist) {
  const parts = []
  if (title) parts.push(title)
  if (artist) parts.push(artist)
  return parts.join(' ').trim()
}

export default function useThumbnail(title, artist) {
  const [thumbnail, setThumbnail] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const q = buildQuery(title, artist)
    if (!q) return

    const key = q.toLowerCase()
    if (cache.has(key)) {
      setThumbnail(cache.get(key))
      return
    }

    let cancelled = false
    setLoading(true)

    fetch(`/api/settings/thumbnail?q=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        const url = data.thumbnail || ''
        cache.set(key, url)
        setThumbnail(url)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          cache.set(key, '')
          setThumbnail('')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [title, artist])

  return { thumbnail, loading }
}
