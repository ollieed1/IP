import React, { useEffect } from 'react'
import useStore from './store/useStore'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import ContentList from './components/ContentList'
import Player from './components/Player'
import AddLibraryModal from './components/AddLibraryModal'
import SeriesDetail from './components/SeriesDetail'
import EmptyState from './components/EmptyState'
import DownloadsView from './components/DownloadsView'

export default function App() {
  const {
    activeSection, searchQuery, activeGroup,
    loadContent, loadProgress, loadLibraries,
    content, isLoading,
    nowPlaying, showAddLibrary, seriesDetail
  } = useStore()

  useEffect(() => {
    loadLibraries()
    loadProgress()
  }, [])

  useEffect(() => {
    const type = activeSection === 'live' ? 'live'
      : activeSection === 'movies' ? 'movie'
      : activeSection === 'series' ? 'series'
      : null
    if (type) loadContent(type, activeGroup, searchQuery)
    // downloads: don't load library content — show empty state until files are saved
  }, [activeSection, activeGroup, searchQuery])

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <TopBar />
        <div className="content-area">
          {activeSection === 'downloads' ? (
            <DownloadsView />
          ) : isLoading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : content.length === 0 ? (
            <EmptyState />
          ) : (
            <ContentList />
          )}
        </div>
        {nowPlaying && <Player />}
      </div>
      {showAddLibrary && <AddLibraryModal />}
      {seriesDetail && <SeriesDetail />}
    </div>
  )
}
