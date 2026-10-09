import React, { useMemo } from 'react'
import useStore from '../store/useStore'
import ContentRow from './ContentRow'

export default function ContentList() {
  const { content, watchProgress, activeSection } = useStore()

  const continueWatching = useMemo(() => {
    return content.filter(item => {
      const p = watchProgress[item.id]
      if (!p || !p.duration) return false
      const pct = p.position / p.duration
      return pct > 0.02 && pct < 0.95
    }).sort((a, b) => {
      return (watchProgress[b.id]?.updatedAt || 0) - (watchProgress[a.id]?.updatedAt || 0)
    }).slice(0, 20)
  }, [content, watchProgress])

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
          {activeSection === 'live' ? 'ALL CHANNELS'
            : activeSection === 'movies' ? 'ALL MOVIES'
            : 'ALL SERIES'}
        </h2>
        {content.map(item => (
          <ContentRow key={item.id} item={item} progress={watchProgress[item.id]} />
        ))}
      </section>
    </div>
  )
}
