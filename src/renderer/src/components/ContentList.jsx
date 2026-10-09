import React, { useMemo, useState, useCallback } from 'react'
import useStore from '../store/useStore'
import ContentRow from './ContentRow'

const PAGE_SIZE = 80

export default function ContentList() {
  const { content, watchProgress, activeSection } = useStore()
  const [limit, setLimit] = useState(PAGE_SIZE)

  // Reset limit when content changes
  const resetLimit = useCallback(() => setLimit(PAGE_SIZE), [])
  const prevContent = React.useRef(content)
  if (prevContent.current !== content) {
    prevContent.current = content
    if (limit !== PAGE_SIZE) setLimit(PAGE_SIZE)
  }

  const continueWatching = useMemo(() => {
    return content.filter(item => {
      const p = watchProgress[item.id]
      if (!p || !p.duration) return false
      const pct = p.position / p.duration
      return pct > 0.02 && pct < 0.95
    }).sort((a, b) =>
      (watchProgress[b.id]?.updatedAt || 0) - (watchProgress[a.id]?.updatedAt || 0)
    ).slice(0, 12)
  }, [content, watchProgress])

  const visible = useMemo(() => content.slice(0, limit), [content, limit])
  const remaining = content.length - visible.length

  const sectionLabel = activeSection === 'live' ? 'ALL CHANNELS'
    : activeSection === 'movies' ? 'ALL MOVIES'
    : 'ALL SERIES'

  return (
    <div className="content-list">
      {continueWatching.length > 0 && (
        <section className="list-section">
          <h2 className="section-label">CONTINUE WATCHING</h2>
          {continueWatching.map(item => (
            <ContentRow key={item.id} item={item} progress={watchProgress[item.id]} />
          ))}
        </section>
      )}

      <section className="list-section">
        <h2 className="section-label">
          {sectionLabel}
          <span className="section-count">{content.length.toLocaleString()}</span>
        </h2>
        {visible.map(item => (
          <ContentRow key={item.id} item={item} progress={watchProgress[item.id]} />
        ))}
        {remaining > 0 && (
          <button className="load-more" onClick={() => setLimit(l => l + PAGE_SIZE)}>
            Show {Math.min(PAGE_SIZE, remaining).toLocaleString()} more
            <span className="load-more-total"> · {remaining.toLocaleString()} remaining</span>
          </button>
        )}
      </section>
    </div>
  )
}
