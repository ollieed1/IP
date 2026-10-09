import React, { useMemo, useState, useRef, useEffect } from 'react'
import useStore from '../store/useStore'
import ContentRow from './ContentRow'
import ContentCard from './ContentCard'
import ChannelCard from './ChannelCard'

const PAGE_SIZE = 80
const CARD_PAGE = 60

const CATEGORY_PRIORITY = [
  'sport', 'football', 'soccer', 'cricket', 'tennis', 'basketball',
  'kid', 'child', 'cartoon', 'disney', 'nickelodeon',
  'movie', 'film', 'cinema', 'hbo',
  'news', 'politic', 'business',
  'music', 'radio',
  'docu', 'nature', 'discovery',
  'entertainment', 'comedy', 'drama',
]

function categoryPriority(name) {
  const n = name.toLowerCase()
  const idx = CATEGORY_PRIORITY.findIndex(k => n.includes(k))
  return idx >= 0 ? idx : 999
}

function getCategoryIcon(name) {
  const n = name.toLowerCase()
  if (n.includes('sport') || n.includes('football') || n.includes('soccer') || n.includes('cricket') || n.includes('tennis')) return '⚽'
  if (n.includes('kid') || n.includes('child') || n.includes('cartoon') || n.includes('disney') || n.includes('nick')) return '🎠'
  if (n.includes('movie') || n.includes('film') || n.includes('cinema')) return '🎬'
  if (n.includes('news') || n.includes('politic') || n.includes('current')) return '📰'
  if (n.includes('music') || n.includes('radio') || n.includes('mtv')) return '🎵'
  if (n.includes('docu') || n.includes('nature') || n.includes('discovery')) return '🌿'
  if (n.includes('comedy')) return '😄'
  if (n.includes('entertainment') || n.includes('lifestyle')) return '✨'
  if (n.includes('drama')) return '🎭'
  return '📺'
}

// Grouped live channels
function LiveView({ content, watchProgress, continueWatching }) {
  const [liveLimit, setLiveLimit] = useState(PAGE_SIZE)
  const prevLen = useRef(content.length)
  useEffect(() => {
    if (prevLen.current !== content.length) {
      prevLen.current = content.length
      setLiveLimit(PAGE_SIZE)
    }
  }, [content.length])

  const grouped = useMemo(() => {
    const map = {}
    for (const item of content.slice(0, liveLimit)) {
      const g = item.group || 'Other'
      if (!map[g]) map[g] = []
      map[g].push(item)
    }
    return Object.entries(map).sort(([a], [b]) => categoryPriority(a) - categoryPriority(b))
  }, [content, liveLimit])

  const remaining = content.length - liveLimit

  return (
    <div className="content-list">
      {continueWatching.length > 0 && (
        <section className="list-section">
          <h2 className="section-label">CONTINUE WATCHING</h2>
          <div className="channel-card-grid">
            {continueWatching.map(item => (
              <ChannelCard key={item.id} item={item} progress={watchProgress[item.id]} />
            ))}
          </div>
        </section>
      )}

      {grouped.map(([group, items]) => (
        <CategoryGroup key={group} title={group} items={items} watchProgress={watchProgress} />
      ))}

      {remaining > 0 && (
        <button className="load-more" onClick={() => setLiveLimit(l => l + PAGE_SIZE)}>
          Show {Math.min(PAGE_SIZE, remaining).toLocaleString()} more channels
          <span className="load-more-total"> · {remaining.toLocaleString()} remaining</span>
        </button>
      )}
    </div>
  )
}

// Card grid for movies/series
function CardView({ content, watchProgress, sortBy, continueWatching, label }) {
  const [cardLimit, setCardLimit] = useState(CARD_PAGE)
  const prevLen = useRef(content.length)
  useEffect(() => {
    if (prevLen.current !== content.length) {
      prevLen.current = content.length
      setCardLimit(CARD_PAGE)
    }
  }, [content.length])

  const sorted = useMemo(() => {
    if (sortBy === 'az') return [...content].sort((a, b) => a.name.localeCompare(b.name))
    if (sortBy === 'za') return [...content].sort((a, b) => b.name.localeCompare(a.name))
    return content
  }, [content, sortBy])

  const visible = sorted.slice(0, cardLimit)
  const remaining = sorted.length - visible.length

  return (
    <div className="content-list">
      {continueWatching.length > 0 && (
        <section className="list-section">
          <h2 className="section-label">CONTINUE WATCHING</h2>
          <div className="card-grid">
            {continueWatching.map(item => (
              <ContentCard key={item.id} item={item} progress={watchProgress[item.id]} />
            ))}
          </div>
        </section>
      )}

      <section className="list-section">
        <h2 className="section-label">
          {label}
          <span className="section-count">{sorted.length.toLocaleString()}</span>
        </h2>
        <div className="card-grid">
          {visible.map(item => (
            <ContentCard key={item.id} item={item} progress={watchProgress[item.id]} />
          ))}
        </div>
        {remaining > 0 && (
          <button className="load-more" onClick={() => setCardLimit(l => l + CARD_PAGE)}>
            Show {Math.min(CARD_PAGE, remaining).toLocaleString()} more
            <span className="load-more-total"> · {remaining.toLocaleString()} remaining</span>
          </button>
        )}
      </section>
    </div>
  )
}

function CategoryGroup({ title, items, watchProgress }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <section className="list-section channel-group">
      <button className="channel-group-header" onClick={() => setCollapsed(c => !c)}>
        <span className="channel-group-icon">{getCategoryIcon(title)}</span>
        <span className="section-label" style={{ margin: 0 }}>{title}</span>
        <span className="channel-group-count">{items.length}</span>
        <svg
          className={`channel-group-chevron ${collapsed ? 'collapsed' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        ><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {!collapsed && (
        <div className="channel-card-grid">
          {items.map(item => (
            <ChannelCard key={item.id} item={item} progress={watchProgress[item.id]} />
          ))}
        </div>
      )}
    </section>
  )
}

export default function ContentList() {
  const { content, allContent, watchProgress, activeSection, sortBy } = useStore()

  const continueWatching = useMemo(() => {
    const base = allContent.length > 0 ? allContent : content
    return base.filter(item => {
      const p = watchProgress[item.id]
      if (!p?.duration) return false
      const pct = p.position / p.duration
      return pct > 0.02 && pct < 0.95
    }).sort((a, b) =>
      (watchProgress[b.id]?.updatedAt || 0) - (watchProgress[a.id]?.updatedAt || 0)
    ).slice(0, 12)
  }, [content, allContent, watchProgress])

  if (activeSection === 'live') {
    return <LiveView content={content} watchProgress={watchProgress} continueWatching={continueWatching} />
  }

  return (
    <CardView
      content={content}
      watchProgress={watchProgress}
      sortBy={sortBy}
      continueWatching={continueWatching}
      label={activeSection === 'movies' ? 'ALL MOVIES' : 'ALL SERIES'}
    />
  )
}
