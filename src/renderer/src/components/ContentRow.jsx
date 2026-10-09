import React, { useState } from 'react'
import useStore from '../store/useStore'

function formatDuration(seconds) {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatProgress(p) {
  if (!p || !p.duration) return null
  const pct = Math.round((p.position / p.duration) * 100)
  const remaining = Math.round((p.duration - p.position) / 60)
  return { pct, remaining }
}

export default function ContentRow({ item, progress }) {
  const { setNowPlaying, setSeriesDetail } = useStore()
  const [imgError, setImgError] = useState(false)
  const prog = formatProgress(progress)

  const handleClick = () => {
    if (item.type === 'series') {
      setSeriesDetail(item)
    } else {
      setNowPlaying(item)
    }
  }

  return (
    <div className="content-row" onClick={handleClick}>
      <div className="row-thumb">
        {item.logo && !imgError ? (
          <img
            src={item.logo}
            alt={item.name}
            onError={() => setImgError(true)}
            draggable={false}
          />
        ) : (
          <div className="row-thumb-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2" y="7" width="20" height="13" rx="2"/>
              <path d="M16 2L12 6 8 2"/>
            </svg>
          </div>
        )}
        {prog && <div className="row-thumb-progress" style={{ width: `${prog.pct}%` }} />}
      </div>

      <div className="row-info">
        <span className="row-name">{item.name}</span>
        <span className="row-meta">
          {item.type === 'movie' && item.year ? `${item.year} · ` : ''}
          {item.type === 'movie' ? 'Movie' : item.type === 'series' ? 'Series' : item.group}
          {prog ? ` · ${prog.remaining}m left` : ''}
          {item.duration && !prog ? ` · ${formatDuration(parseFloat(item.duration))}` : ''}
        </span>
      </div>

      <div className="row-actions">
        {item.type !== 'series' && (
          <button className="row-play-btn" onClick={(e) => { e.stopPropagation(); setNowPlaying(item) }}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7z"/></svg>
          </button>
        )}
        <svg className="row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </div>
  )
}
