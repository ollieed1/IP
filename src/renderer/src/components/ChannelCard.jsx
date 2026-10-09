import React, { useState } from 'react'
import useStore from '../store/useStore'

export default function ChannelCard({ item, progress }) {
  const { setNowPlaying } = useStore()
  const [imgError, setImgError] = useState(false)
  const [hovered, setHovered] = useState(false)

  const pct = progress?.duration
    ? Math.round((progress.position / progress.duration) * 100)
    : null
  const showProgress = pct > 2 && pct < 95

  return (
    <div
      className={`channel-card ${hovered ? 'hovered' : ''}`}
      onClick={() => setNowPlaying(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={item.name}
    >
      <div className="channel-card-logo">
        {item.logo && !imgError ? (
          <img
            src={item.logo}
            alt={item.name}
            onError={() => setImgError(true)}
            draggable={false}
          />
        ) : (
          <div className="channel-card-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2" y="7" width="20" height="13" rx="2"/>
              <path d="M16 2L12 6 8 2"/>
            </svg>
          </div>
        )}

        <div className="channel-card-overlay">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7z"/></svg>
        </div>

        {showProgress && (
          <div className="channel-progress-bar">
            <div className="channel-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      <span className="channel-card-name">{item.name}</span>
    </div>
  )
}
