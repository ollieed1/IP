import React from 'react'
import useStore from '../store/useStore'

export default function EmptyState() {
  const { setShowAddLibrary, libraries } = useStore()

  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="14" width="56" height="36" rx="4"/>
          <path d="M44 4L32 14 20 4"/>
          <path d="M20 50l12 10 12-10"/>
        </svg>
      </div>
      {libraries.length === 0 ? (
        <>
          <h3 className="empty-title">No libraries yet</h3>
          <p className="empty-subtitle">Add an M3U playlist or Xtream Codes provider to get started</p>
          <button className="btn-primary" onClick={() => setShowAddLibrary(true)}>Add Library</button>
        </>
      ) : (
        <>
          <h3 className="empty-title">Nothing here yet</h3>
          <p className="empty-subtitle">Your library is loading or has no content in this category</p>
        </>
      )}
    </div>
  )
}
