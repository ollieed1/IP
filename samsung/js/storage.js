/**
 * storage.js — localStorage wrapper (replaces electron-store)
 * Exported as window.Storage
 */
const Storage = {
  /**
   * Get a value from localStorage, returning fallback if missing or invalid JSON
   */
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return fallback
      return JSON.parse(raw) ?? fallback
    } catch {
      return fallback
    }
  },

  /**
   * Save a value to localStorage as JSON
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.warn('[Storage] Failed to write key:', key, e)
    }
  },

  /**
   * Remove a key from localStorage
   */
  remove(key) {
    try {
      localStorage.removeItem(key)
    } catch (e) {
      console.warn('[Storage] Failed to remove key:', key, e)
    }
  },

  // ─── Libraries ──────────────────────────────────────────────

  getLibraries() {
    return Storage.get('libraries', [])
  },

  saveLibraries(libs) {
    Storage.set('libraries', libs)
  },

  addLibrary(lib) {
    const libs = Storage.getLibraries()
    // Replace if same id, otherwise append
    const idx = libs.findIndex(l => l.id === lib.id)
    if (idx >= 0) libs[idx] = lib
    else libs.push(lib)
    Storage.saveLibraries(libs)
  },

  removeLibrary(id) {
    const libs = Storage.getLibraries().filter(l => l.id !== id)
    Storage.saveLibraries(libs)
    Storage.remove(`content_${id}`)
  },

  // ─── Content per library ────────────────────────────────────

  getContent(libId) {
    return Storage.get(`content_${libId}`, [])
  },

  saveContent(libId, items) {
    Storage.set(`content_${libId}`, items)
  },

  /**
   * Return all content items across all libraries, merged into one array
   */
  getAllContent() {
    const libs = Storage.getLibraries()
    return libs.flatMap(lib => Storage.getContent(lib.id))
  },

  // ─── Playback progress ──────────────────────────────────────

  getProgress(id) {
    return Storage.get(`progress_${id}`, null)
  },

  setProgress(id, position, duration) {
    Storage.set(`progress_${id}`, {
      position,
      duration,
      updatedAt: Date.now(),
    })
  },

  // ─── App state ──────────────────────────────────────────────

  getLastSection() {
    return Storage.get('lastSection', 'live')
  },

  setLastSection(section) {
    Storage.set('lastSection', section)
  },

  getLastCategory(section) {
    return Storage.get(`lastCategory_${section}`, null)
  },

  setLastCategory(section, category) {
    Storage.set(`lastCategory_${section}`, category)
  },
}

window.Storage = Storage
