import React, { useState } from 'react'
import useStore from '../store/useStore'

function formatProgress(p) {
  if (!p?.duration) return null
  const pct = Math.round((p.position / p.duration) * 100)
  return pct > 2 && pct < 95 ? pct : null
}

export default function ContentCard({ item, progress }) {
  const { setNowPlaying, setSeriesDetail } = useStore()
  const [imgError, setImgError] = useState(false)
  const [hovered, setHovered] = useState(false)
  const pct = formatProgress(progress)

  const handleClick = () => {
    if (item.type === 'series') setSeriesDetail(item)
    else setNowPlaying(item)
  }

  const handlePlay = (e) => {
    e.stopPropagation()
    if (item.type === 'series') setSeriesDetail(item)
    else setNowPlaying(item)
  }

  return (
    <div
      className={`content-card ${hovered ? 'hovered' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="card-poster">
        {item.logo && !imgError ? (
          <img
            src={item.logo}
            alt={item.name}
            onError={() => setImgError(true)}
            draggable={false}
          />
        ) : (
          <div className="card-poster-placeholder">
            {item.type === 'series'
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="2" y="3" width="9" height="9" rx="1.5"/><rect x="13" y="3" width="9" height="9" rx="1.5"/><rect x="2" y="14" width="9" height="7" rx="1.5"/><rect x="13" y="14" width="9" height="7" rx="1.5"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="12" cy="12" r="3"/></svg>
            }
            <span>{item.type === 'series' ? 'Series' : 'Movie'}</span>
          </div>
        )}

        {/* Hover play overlay */}
        <div className="card-overlay">
          <button className="card-play-btn" onClick={handlePlay}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7z"/></svg>
          </button>
        </div>

        {/* Progress bar */}
        {pct && (
          <div className="card-progress-bar">
            <div className="card-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        )}

        {/* Badges */}
        {item.year && <div className="card-badge card-badge-year">{item.year}</div>}
        {item.type === 'series' && <div className="card-badge card-badge-series">Series</div>}
      </div>

      <div className="card-info">
        <span className="card-title">{item.name}</span>
        {item.rating && parseFloat(item.rating) > 0 && (
          <span className="card-rating">★ {parseFloat(item.rating).toFixed(1)}</span>
        )}
      </div>
    </div>
  )
}
