import { ipcMain } from 'electron'
import store from './store'
import { parseM3UFromUrl } from './m3u-parser'
import { authenticate, fetchAll, getSeriesInfo } from './xtream'
import { getProxyUrl, ffmpegAvailable } from './stream-proxy'

export function registerIpcHandlers() {
  // ---------- store ----------
  ipcMain.handle('store:get', (_, key) => store.get(key))
  ipcMain.handle('store:set', (_, key, value) => { store.set(key, value) })

  // ---------- libraries ----------
  ipcMain.handle('library:list', () => store.get('libraries'))

  ipcMain.handle('library:add', async (_, lib) => {
    try {
      const libraries = store.get('libraries')
      libraries.push(lib)
      store.set('libraries', libraries)
      await fetchLibraryContent(lib)
      return { success: true }
    } catch (e) {
      console.error('library:add error:', e.message)
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('library:delete', (_, id) => {
    try {
      const libraries = store.get('libraries').filter(l => l.id !== id)
      store.set('libraries', libraries)
      const content = store.get('content')
      delete content[id]
      store.set('content', content)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('library:refresh', async (_, id) => {
    const lib = store.get('libraries').find(l => l.id === id)
    if (!lib) return { success: false }
    await fetchLibraryContent(lib)
    return { success: true }
  })

  // ---------- content ----------
  ipcMain.handle('content:get', (_, filters = {}) => {
    const allContent = store.get('content')
    let items = Object.values(allContent).flat()

    if (filters.type) items = items.filter(i => i.type === filters.type)
    if (filters.group) items = items.filter(i => i.group === filters.group)
    if (filters.query) {
      const q = filters.query.toLowerCase()
      items = items.filter(i => i.name?.toLowerCase().includes(q))
    }
    return items
  })

  ipcMain.handle('content:groups', (_, type) => {
    const allContent = store.get('content')
    const items = Object.values(allContent).flat()
    const filtered = type ? items.filter(i => i.type === type) : items
    return [...new Set(filtered.map(i => i.group))].filter(Boolean).sort()
  })

  // ---------- series ----------
  ipcMain.handle('series:info', async (_, { host, username, password, seriesId }) => {
    return getSeriesInfo(host, username, password, seriesId)
  })

  // ---------- watch progress ----------
  ipcMain.handle('progress:get', (_, contentId) => {
    return store.get(`watchProgress.${contentId}`) || null
  })

  ipcMain.handle('progress:set', (_, contentId, position, duration) => {
    store.set(`watchProgress.${contentId}`, { position, duration, updatedAt: Date.now() })
  })

  ipcMain.handle('progress:all', () => store.get('watchProgress'))

  // ---------- stream proxy ----------
  ipcMain.handle('stream:proxy', (_, sourceUrl) => {
    const url = getProxyUrl(sourceUrl)
    return { url, ffmpegAvailable: ffmpegAvailable() }
  })

  // ---------- auth test ----------
  ipcMain.handle('xtream:auth', async (_, host, username, password) => {
    try {
      return await authenticate(host, username, password)
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}

async function fetchLibraryContent(lib) {
  try {
    let items = []
    if (lib.type === 'm3u') {
      items = await parseM3UFromUrl(lib.url)
    } else if (lib.type === 'xtream') {
      items = await fetchAll(lib)
    }
    // Tag each item with libraryId
    items = items.map(i => ({ ...i, libraryId: lib.id }))
    const content = store.get('content')
    content[lib.id] = items
    store.set('content', content)
  } catch (e) {
    console.error('Failed to fetch library content:', e.message)
  }
}
