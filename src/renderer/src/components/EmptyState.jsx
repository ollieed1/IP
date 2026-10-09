import React from 'react'
import useStore from '../store/useStore'

const STATES = {
  downloads: {
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 8v32M20 28l12 12 12-12"/>
        <path d="M8 48h48"/>
        <rect x="12" y="52" width="40" height="4" rx="2" opacity="0.3"/>
      </svg>
    ),
    title: 'No downloads yet',
    subtitle: 'When you save a film or episode it will appear here.'
  },
  noLibrary: {
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="14" width="56" height="36" rx="4"/>
        <path d="M44 4L32 14 20 4"/>
      </svg>
    ),
    title: 'No libraries yet',
    subtitle: 'Add an M3U playlist or Xtream Codes provider to get started.'
  },
  noContent: {
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="28" cy="28" r="18"/>
        <path d="M42 42l14 14"/>
      </svg>
    ),
    title: 'Nothing found',
    subtitle: 'Try a different search or category.'
  }
}

export default function EmptyState() {
  const { setShowAddLibrary, libraries, activeSection } = useStore()

  let state
  if (activeSection === 'downloads') {
    state = STATES.downloads
  } else if (libraries.length === 0) {
    state = STATES.noLibrary
  } else {
    state = STATES.noContent
  }

  return (
    <div className="empty-state">
      <div className="empty-icon">{state.icon}</div>
      <h3 className="empty-title">{state.title}</h3>
      <p className="empty-subtitle">{state.subtitle}</p>
      {libraries.length === 0 && activeSection !== 'downloads' && (
        <button className="btn-primary" onClick={() => setShowAddLibrary(true)}>
          Add Library
        </button>
      )}
    </div>
  )
}
