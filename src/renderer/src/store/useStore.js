import { create } from 'zustand'

const useStore = create((set, get) => ({
  // Navigation
  activeSection: 'live',
  setActiveSection: (s) => set({ activeSection: s, activeGroup: null, searchQuery: '' }),

  // Search
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  // Category filter
  activeGroup: null,
  setActiveGroup: (g) => set({ activeGroup: g }),

  // Content
  content: [],
  groups: [],
  isLoading: false,

  loadContent: async (type, group, query) => {
    set({ isLoading: true })
    const filters = { type }
    if (group) filters.group = group
    if (query) filters.query = query
    const items = await window.api.getContent(filters)
    const groups = await window.api.getGroups(type)
    set({ content: items, groups, isLoading: false })
  },

  // Watch progress
  watchProgress: {},
  loadProgress: async () => {
    const progress = await window.api.getAllProgress()
    set({ watchProgress: progress || {} })
  },
  updateProgress: (id, position, duration) => {
    window.api.setProgress(id, position, duration)
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
    const libs = await window.api.listLibraries()
    set({ libraries: libs || [] })
  },

  // Add library modal
  showAddLibrary: false,
  setShowAddLibrary: (v) => set({ showAddLibrary: v }),

  // Series detail
  seriesDetail: null,
  setSeriesDetail: (s) => set({ seriesDetail: s }),
}))

export default useStore
