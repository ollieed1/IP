/**
 * xtream.js — Xtream Codes API client (fetch-based, no axios)
 * Exported as window.XtreamClient
 */
const XtreamClient = (() => {

  /**
   * Build the base API URL from server + credentials.
   * Normalises trailing slashes from the server URL.
   */
  function buildBase(server, username, password) {
    const base = server.replace(/\/+$/, '')
    return `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
  }

  /**
   * Perform an authenticated API request.
   * @param {string} server
   * @param {string} username
   * @param {string} password
   * @param {Object} params — additional query params
   * @returns {Promise<any>}
   */
  async function apiRequest(server, username, password, params = {}) {
    const base = buildBase(server, username, password)
    const query = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')
    const url = query ? `${base}&${query}` : base

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Xtream API error: HTTP ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Authenticate with the server and return account info.
   * Throws if credentials are invalid.
   * @param {string} server
   * @param {string} username
   * @param {string} password
   * @returns {Promise<{userInfo, serverInfo}>}
   */
  async function authenticate(server, username, password) {
    const data = await apiRequest(server, username, password)

    if (!data || !data.user_info) {
      throw new Error('Invalid credentials or server did not return expected data')
    }

    if (data.user_info.auth === 0 || data.user_info.auth === '0') {
      throw new Error('Authentication failed — check username and password')
    }

    return {
      userInfo:   data.user_info,
      serverInfo: data.server_info || {},
    }
  }

  /**
   * Fetch all live streams and return as normalised items.
   */
  async function fetchLive(server, username, password) {
    const streams = await apiRequest(server, username, password, {
      action: 'get_live_streams',
    })

    if (!Array.isArray(streams)) return []

    const serverInfo = (await apiRequest(server, username, password)).server_info || {}
    const baseStream = server.replace(/\/+$/, '')

    return streams.map((s, i) => {
      const ext = (serverInfo.rtmp_port) ? 'm3u8' : 'ts'
      const url = `${baseStream}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${s.stream_id}.${ext}`
      return {
        id:    `live_${s.stream_id || i}`,
        name:  s.name || `Channel ${i + 1}`,
        logo:  s.stream_icon || '',
        group: s.category_name || s.category_id || '',
        url,
        type:  'live',
      }
    })
  }

  /**
   * Fetch all VOD (movies) and return as normalised items.
   */
  async function fetchMovies(server, username, password) {
    const vods = await apiRequest(server, username, password, {
      action: 'get_vod_streams',
    })

    if (!Array.isArray(vods)) return []

    const baseStream = server.replace(/\/+$/, '')

    return vods.map((v, i) => {
      const ext = v.container_extension || 'mp4'
      const url = `${baseStream}/movie/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${v.stream_id}.${ext}`
      return {
        id:       `movie_${v.stream_id || i}`,
        name:     v.name || `Movie ${i + 1}`,
        logo:     v.stream_icon || v.cover || '',
        group:    v.category_name || v.category_id || '',
        url,
        type:     'movie',
        rating:   v.rating || '',
        plot:     v.plot || '',
        year:     v.year || '',
        duration: v.duration || '',
      }
    })
  }

  /**
   * Fetch all series (as top-level entries, not individual episodes).
   */
  async function fetchSeries(server, username, password) {
    const series = await apiRequest(server, username, password, {
      action: 'get_series',
    })

    if (!Array.isArray(series)) return []

    return series.map((s, i) => ({
      id:    `series_${s.series_id || i}`,
      name:  s.name || `Series ${i + 1}`,
      logo:  s.cover || s.stream_icon || '',
      group: s.category_name || s.category_id || '',
      url:   '',  // series are browsed via episodes; URL is populated per-episode
      type:  'series',
      seriesId: s.series_id,
      rating:   s.rating || '',
      plot:     s.plot || '',
      year:     s.year || '',
    }))
  }

  /**
   * Fetch all content (live + movies + series) in one call.
   * Returns a flat array of normalised items.
   * @param {string} server
   * @param {string} username
   * @param {string} password
   * @returns {Promise<Array>}
   */
  async function fetchAll(server, username, password) {
    // Run in parallel for speed; individual failures fall back to empty arrays
    const [live, movies, series] = await Promise.allSettled([
      fetchLive(server, username, password),
      fetchMovies(server, username, password),
      fetchSeries(server, username, password),
    ])

    const liveItems   = live.status   === 'fulfilled' ? live.value   : []
    const movieItems  = movies.status === 'fulfilled' ? movies.value : []
    const seriesItems = series.status === 'fulfilled' ? series.value : []

    if (live.status === 'rejected')   console.warn('[Xtream] Live fetch failed:', live.reason)
    if (movies.status === 'rejected') console.warn('[Xtream] Movies fetch failed:', movies.reason)
    if (series.status === 'rejected') console.warn('[Xtream] Series fetch failed:', series.reason)

    return [...liveItems, ...movieItems, ...seriesItems]
  }

  return {
    authenticate,
    fetchAll,
    fetchLive,
    fetchMovies,
    fetchSeries,
  }
})()

window.XtreamClient = XtreamClient
