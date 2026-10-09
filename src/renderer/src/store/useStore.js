import { create } from 'zustand'

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
  sortBy: 'default', // 'default' | 'az' | 'za' | 'recent'
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
      window.api.getContent(filters),
      window.api.getGroups(type),
      group || query ? window.api.getContent({ type }) : Promise.resolve(null)
    ])
    set({
      content: items,
      groups,
      allContent: all || items,
      isLoading: false
    })
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

  // Modals
  showAddLibrary: false,
  setShowAddLibrary: (v) => set({ showAddLibrary: v }),

  seriesDetail: null,
  setSeriesDetail: (s) => set({ seriesDetail: s }),
}))

export default useStore
