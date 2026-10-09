import { create } from 'zustand'
import api from '../api/index.js'

const useStore = create((set, get) => ({
  // Navigation
  activeSection: 'live',
  setActiveSection: (s) => set({ activeSection: s, activeGroup: null, searchQuery: '', sortBy: 'default' }),

  // Search
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  // Category / genre filter
  activeGroup: null,
  setActiveGroup: (g) => set({ activeGroup: g }),

  // Sort
  sortBy: 'default', // 'default' | 'az' | 'za'
  setSortBy: (s) => set({ sortBy: s }),

  // All content (unfiltered, for grouping in live view)
  allContent: [],

  // Displayed content (filtered by active section)
  content: [],
  groups: [],
  isLoading: false,

  loadContent: async (type, group, query) => {
    set({ isLoading: true })
    const filters = { type }
    if (group) filters.group = group
    if (query) filters.query = query
    const [items, groups, all] = await Promise.all([
      api.getContent(filters),
      api.getGroups(type),
      group || query ? api.getContent({ type }) : Promise.resolve(null)
    ])
    set({ content: items, groups, allContent: all || items, isLoading: false })
  },

  // Watch progress
  watchProgress: {},
  loadProgress: async () => {
    const progress = await api.getAllProgress()
    set({ watchProgress: progress || {} })
  },
  updateProgress: (id, position, duration) => {
    api.setProgress(id, position, duration)
    set(state => ({
      watchProgress: {
        ...state.watchProgress,
        [id]: { position, duration, updatedAt: Date.now() }
      }
    }))
  },

  // Player
  nowPlaying: null,
  setNowPlaying: (item) => set({ nowPlaying: item }),
  clearNowPlaying: () => set({ nowPlaying: null }),

  // Libraries
  libraries: [],
  loadLibraries: async () => {
    const libs = await api.listLibraries()
    set({ libraries: libs || [] })

    // Web: content cache is in-memory; re-fetch all library content on init
    if (libs?.length && !window.api) {
      set({ isLoading: true })
      await api.initLibraries()
      // Reload current section's content now that cache is populated
      const { activeSection, activeGroup, searchQuery } = get()
      const type = activeSection === 'live' ? 'live'
        : activeSection === 'movies' ? 'movie'
        : activeSection === 'series' ? 'series'
        : null
      if (type) {
        const filters = { type }
        if (activeGroup) filters.group = activeGroup
        if (searchQuery) filters.query = searchQuery
        const items = api.getContent(filters)
        const groups = api.getGroups(type)
        const all = (activeGroup || searchQuery) ? api.getContent({ type }) : items
        set({ content: items, groups, allContent: all, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    }
  },

  // Modals
  showAddLibrary: false,
  setShowAddLibrary: (v) => set({ showAddLibrary: v }),

  seriesDetail: null,
  setSeriesDetail: (s) => set({ seriesDetail: s }),
}))

export default useStore
