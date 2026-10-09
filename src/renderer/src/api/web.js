// Browser-native API — mirrors the window.api (Electron preload) interface.
// Uses localStorage for persistence and a CORS proxy at /api/fetch for network requests.

const LIBS_KEY = 'iptv_libs'
const PROG_KEY = 'iptv_progress'

// ── Storage ───────────────────────────────────────────────────────────────
function loadLibs() {
  try { return JSON.parse(localStorage.getItem(LIBS_KEY) || '[]') } catch { return [] }
}
function saveLibs(libs) { localStorage.setItem(LIBS_KEY, JSON.stringify(libs)) }
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROG_KEY) || '{}') } catch { return {} }
}
function saveProgress(p) { localStorage.setItem(PROG_KEY, JSON.stringify(p)) }

// ── CORS proxy ────────────────────────────────────────────────────────────
async function proxyGet(url) {
  const res = await fetch(`/api/fetch?url=${encodeURIComponent(url)}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res
}

// ── M3U parser ────────────────────────────────────────────────────────────
function attr(line, key) {
  const m = line.match(new RegExp(`${key}="([^"]*)"`, 'i'))
  return m ? m[1] : ''
}

function parseM3UText(text, libId) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const items = []
  let current = null
  let n = 0
  for (const line of lines) {
    if (line.startsWith('#EXTINF')) {
      const name = line.includes(',') ? line.split(',').slice(1).join(',').trim() : ''
      current = {
        id: `${libId}_m3u_${n++}`,
        name: attr(line, 'tvg-name') || name,
        logo: attr(line, 'tvg-logo'),
        group: attr(line, 'group-title') || 'Uncategorised',
        tvgId: attr(line, 'tvg-id'),
        type: 'live',
        libraryId: libId,
      }
    } else if (line.startsWith('http') && current) {
      current.url = line
      const g = current.group.toLowerCase()
      const u = line.toLowerCase()
      if (u.includes('/movie/') || g.includes('movie') || g.includes('film') || g.includes('vod')) current.type = 'movie'
      else if (u.includes('/series/') || g.includes('series') || g.includes('show')) current.type = 'series'
      items.push(current)
      current = null
    }
  }
  return items
}

// ── Xtream client ─────────────────────────────────────────────────────────
async function xtreamGet(host, username, password, action, extra = '') {
  const base = host.replace(/\/$/, '')
  const url = `${base}/player_api.php?username=${username}&password=${password}&action=${action}${extra}`
  const res = await proxyGet(url)
  return res.json()
}

async function fetchXtream(lib) {
  const { host, username, password, id } = lib
  const base = host.replace(/\/$/, '')

  const [liveCats, vodCats, seriesCats] = await Promise.all([
    xtreamGet(host, username, password, 'get_live_categories').catch(() => []),
    xtreamGet(host, username, password, 'get_vod_categories').catch(() => []),
    xtreamGet(host, username, password, 'get_series_categories').catch(() => []),
  ])
  const [liveStreams, vodStreams, seriesList] = await Promise.all([
    xtreamGet(host, username, password, 'get_live_streams').catch(() => []),
    xtreamGet(host, username, password, 'get_vod_streams').catch(() => []),
    xtreamGet(host, username, password, 'get_series').catch(() => []),
  ])

  const catMap = {}
  for (const c of [...(liveCats || []), ...(vodCats || []), ...(seriesCats || [])]) {
    catMap[c.category_id] = c.category_name
  }

  const live = (liveStreams || []).map(s => ({
    id: `${id}_xt_live_${s.stream_id}`,
    name: s.name, logo: s.stream_icon,
    group: catMap[s.category_id] || 'Live TV',
    url: `${base}/live/${username}/${password}/${s.stream_id}.m3u8`,
    type: 'live', libraryId: id,
  }))

  const movies = (vodStreams || []).map(s => ({
    id: `${id}_xt_vod_${s.stream_id}`,
    name: s.name, logo: s.stream_icon,
    group: catMap[s.category_id] || 'Movies',
    url: `${base}/movie/${username}/${password}/${s.stream_id}.${s.container_extension || 'mp4'}`,
    type: 'movie', rating: s.rating, plot: s.plot, year: s.year, libraryId: id,
  }))

  const series = (seriesList || []).map(s => ({
    id: `${id}_xt_series_${s.series_id}`,
    name: s.name, logo: s.cover,
    group: catMap[s.category_id] || 'Series',
    url: null, type: 'series', seriesId: s.series_id,
    rating: s.rating, plot: s.plot, year: s.year,
    host, username, password, libraryId: id,
  }))

  return [...live, ...movies, ...series]
}

// ── Content cache (in-memory, rebuilt each session) ───────────────────────
const contentCache = {}

async function fetchLibContent(lib) {
  try {
    const items = lib.type === 'm3u'
      ? await parseM3UText(await (await proxyGet(lib.url)).text(), lib.id)
      : lib.type === 'xtream'
        ? await fetchXtream(lib)
        : []
    contentCache[lib.id] = items
  } catch (e) {
    console.error('Failed to load library:', lib.name, e.message)
    contentCache[lib.id] = []
  }
}

// ── Public API ────────────────────────────────────────────────────────────
export const webApi = {
  listLibraries: () => loadLibs(),

  addLibrary: async (lib) => {
    const libs = loadLibs()
    libs.push(lib)
    saveLibs(libs)
    await fetchLibContent(lib)
    return { success: true }
  },

  deleteLibrary: (id) => {
    saveLibs(loadLibs().filter(l => l.id !== id))
    delete contentCache[id]
    return { success: true }
  },

  refreshLibrary: async (id) => {
    const lib = loadLibs().find(l => l.id === id)
    if (lib) await fetchLibContent(lib)
    return { success: true }
  },

  // Called once on app init to populate in-memory cache from saved libraries
  initLibraries: async () => {
    const libs = loadLibs()
    await Promise.all(libs.map(fetchLibContent))
  },

  getContent: (filters = {}) => {
    let items = Object.values(contentCache).flat()
    if (filters.type) items = items.filter(i => i.type === filters.type)
    if (filters.group) items = items.filter(i => i.group === filters.group)
    if (filters.query) {
      const q = filters.query.toLowerCase()
      items = items.filter(i => i.name?.toLowerCase().includes(q))
    }
    return items
  },

  getGroups: (type) => {
    let items = Object.values(contentCache).flat()
    if (type) items = items.filter(i => i.type === type)
    return [...new Set(items.map(i => i.group))].filter(Boolean).sort()
  },

  getAllProgress: () => loadProgress(),

  setProgress: (id, pos, dur) => {
    const p = loadProgress()
    p[id] = { position: pos, duration: dur, updatedAt: Date.now() }
    saveProgress(p)
  },

  getProgress: (id) => loadProgress()[id] || null,

  // No ffmpeg proxy in browser — direct playback (HLS works; AC3 audio in MKV won't transcode)
  proxyStream: () => ({ url: null, ffmpegAvailable: false }),

  testXtreamAuth: async (host, username, password) => {
    try {
      await xtreamGet(host, username, password, 'get_live_categories')
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  },

  getSeriesInfo: async ({ host, username, password, seriesId }) => {
    const base = host.replace(/\/$/, '')
    const data = await xtreamGet(host, username, password, 'get_series_info', `&series_id=${seriesId}`)
    const seasons = {}
    for (const [seasonNum, episodes] of Object.entries(data.episodes || {})) {
      seasons[seasonNum] = episodes.map(ep => ({
        id: `ep_${ep.id}`,
        episodeNum: ep.episode_num,
        title: ep.title,
        plot: ep.info?.plot,
        duration: ep.info?.duration,
        url: `${base}/series/${username}/${password}/${ep.id}.${ep.container_extension || 'mkv'}`,
      }))
    }
    return { info: data.info, seasons }
  },

  storeGet: (key) => {
    try { return JSON.parse(localStorage.getItem(`iptv_s_${key}`) || 'null') } catch { return null }
  },
  storeSet: (key, val) => {
    localStorage.setItem(`iptv_s_${key}`, JSON.stringify(val))
  },
}
