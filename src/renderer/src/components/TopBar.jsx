import React, { useState, useCallback } from 'react'
import useStore from '../store/useStore'

const SECTION_LABELS = {
  live: 'Live TV',
  movies: 'Movies',
  series: 'Series',
  downloads: 'Downloads'
}

const SORT_OPTIONS = [
  { id: 'default', label: 'Recent' },
  { id: 'az', label: 'A–Z' },
  { id: 'za', label: 'Z–A' },
]

export default function TopBar() {
  const { activeSection, searchQuery, setSearchQuery, sortBy, setSortBy, content } = useStore()
  const [focused, setFocused] = useState(false)

  const handleSearch = useCallback((e) => setSearchQuery(e.target.value), [setSearchQuery])

  const showSort = activeSection === 'movies' || activeSection === 'series'

  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div className="topbar-row">
          <h1 className="topbar-title">
            {SECTION_LABELS[activeSection]}
            {content.length > 0 && activeSection !== 'downloads' && (
              <span className="topbar-count">{content.length.toLocaleString()}</span>
            )}
          </h1>

          <div className="topbar-right">
            {showSort && (
              <div className="sort-pills">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    className={`sort-pill ${sortBy === opt.id ? 'active' : ''}`}
                    onClick={() => setSortBy(opt.id)}
                  >{opt.label}</button>
                ))}
              </div>
            )}

            {activeSection !== 'downloads' && (
              <div className={`search-wrap ${focused ? 'focused' : ''}`}>
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>
                </svg>
                <input
                  className="search-input"
                  type="text"
                  placeholder={`Search…`}
                  value={searchQuery}
                  onChange={handleSearch}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                />
                {searchQuery && (
                  <button className="search-clear" onClick={() => setSearchQuery('')}>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6z"/></svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
