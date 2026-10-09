import React from 'react'
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

export default function Sidebar() {
  const { activeSection, setActiveSection, setShowAddLibrary } = useStore()

  return (
    <aside className="sidebar">
      <div className="sidebar-traffic" />

      <nav className="sidebar-nav">
        {NAV.map(item => (
          <button
            key={item.id}
            className={`sidebar-btn ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => setActiveSection(item.id)}
            title={item.label}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button
          className="sidebar-btn sidebar-add"
          onClick={() => setShowAddLibrary(true)}
          title="Add Library"
        >
          <span className="sidebar-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </span>
          <span className="sidebar-label">Add Library</span>
        </button>
      </div>
    </aside>
  )
}
