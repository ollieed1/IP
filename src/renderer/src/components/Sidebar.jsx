import React, { useState } from 'react'
import useStore from '../store/useStore'

const NAV = [
  {
    id: 'live', label: 'Live TV',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M16 2L12 6 8 2"/></svg>
  },
  {
    id: 'movies', label: 'Movies',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 4v16M17 4v16M2 9h20M2 15h20M7 4L2 9M17 4l5 5"/></svg>
  },
  {
    id: 'series', label: 'Series',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="9" height="9" rx="1.5"/><rect x="13" y="3" width="9" height="9" rx="1.5"/><rect x="2" y="14" width="9" height="7" rx="1.5"/><rect x="13" y="14" width="9" height="7" rx="1.5"/></svg>
  },
  {
    id: 'downloads', label: 'Downloads',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v13M7 12l5 5 5-5"/><path d="M3 19h18"/></svg>
  },
]

function LibraryItem({ lib, onRefresh, onDelete }) {
  const [refreshing, setRefreshing] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const handleRefresh = async (e) => {
    e.stopPropagation()
    setRefreshing(true)
    await onRefresh(lib.id)
    setRefreshing(false)
  }

  return (
    <div
      className="library-item"
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <div className="library-dot" />
      <span className="library-name" title={lib.name}>{lib.name}</span>
      <div className="library-actions">
        <button
          className={`library-btn ${refreshing ? 'spinning' : ''}`}
          onClick={handleRefresh}
          title="Refresh"
          disabled={refreshing}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>
        {showDelete && (
          <button className="library-btn library-delete" onClick={(e) => { e.stopPropagation(); onDelete(lib.id) }} title="Remove">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6z"/></svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default function Sidebar() {
  const {
    activeSection, setActiveSection,
    setShowAddLibrary,
    libraries, loadLibraries, loadContent,
    groups, activeGroup, setActiveGroup,
  } = useStore()

  const handleRefresh = async (id) => {
    await window.api.refreshLibrary(id)
    const type = sectionToType(activeSection)
    if (type) await loadContent(type, activeGroup)
  }

  const handleDelete = async (id) => {
    await window.api.deleteLibrary(id)
    await loadLibraries()
    const type = sectionToType(activeSection)
    if (type) await loadContent(type, activeGroup)
  }

  // Filter out 24/7 and noisy categories
  const filteredGroups = groups.filter(g => {
    const n = g.toLowerCase()
    return !n.includes('24/7') && !n.includes('24-7') && n.trim() !== ''
  })

  return (
    <aside className="sidebar">
      <div className="sidebar-traffic" />

      {/* Main nav */}
      <nav className="sidebar-nav">
        {NAV.map(item => (
          <button
            key={item.id}
            className={`sidebar-btn ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => { setActiveSection(item.id); setActiveGroup(null) }}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Category / genre sub-nav — only when there are groups to show */}
      {filteredGroups.length > 0 && activeSection !== 'downloads' && (
        <div className="sidebar-subnav">
          <span className="sidebar-subnav-label">
            {activeSection === 'live' ? 'CHANNELS' : 'GENRES'}
          </span>
          <div className="sidebar-subnav-list">
            <button
              className={`sidebar-subnav-item ${!activeGroup ? 'active' : ''}`}
              onClick={() => setActiveGroup(null)}
            >
              All
            </button>
            {filteredGroups.map(g => (
              <button
                key={g}
                className={`sidebar-subnav-item ${activeGroup === g ? 'active' : ''}`}
                onClick={() => setActiveGroup(activeGroup === g ? null : g)}
                title={g}
              >
                {activeSection === 'live' && <span className="subnav-icon">{getCategoryIcon(g)}</span>}
                <span className="subnav-label">{g}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sidebar-bottom">
        {libraries.length > 0 && (
          <div className="library-section">
            <span className="library-section-label">LIBRARIES</span>
            {libraries.map(lib => (
              <LibraryItem
                key={lib.id}
                lib={lib}
                onRefresh={handleRefresh}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        <button className="sidebar-btn sidebar-add" onClick={() => setShowAddLibrary(true)}>
          <span className="sidebar-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </span>
          <span className="sidebar-label">Add Library</span>
        </button>
      </div>
    </aside>
  )
}

function sectionToType(section) {
  if (section === 'live') return 'live'
  if (section === 'movies') return 'movie'
  if (section === 'series') return 'series'
  return null
}

function getCategoryIcon(name) {
  const n = name.toLowerCase()
  if (n.includes('sport') || n.includes('football') || n.includes('soccer') || n.includes('cricket') || n.includes('tennis') || n.includes('basketball')) return '⚽'
  if (n.includes('kid') || n.includes('child') || n.includes('cartoon') || n.includes('disney') || n.includes('nick')) return '🎠'
  if (n.includes('movie') || n.includes('film') || n.includes('cinema')) return '🎬'
  if (n.includes('news') || n.includes('politic') || n.includes('current')) return '📰'
  if (n.includes('music') || n.includes('radio') || n.includes('mtv')) return '🎵'
  if (n.includes('docu') || n.includes('nature') || n.includes('discovery')) return '🌿'
  if (n.includes('comedy')) return '😄'
  if (n.includes('drama')) return '🎭'
  if (n.includes('entertainment') || n.includes('lifestyle')) return '✨'
  return '📺'
}
