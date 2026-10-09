import axios from 'axios'

function api(host, username, password) {
  const base = host.endsWith('/') ? host.slice(0, -1) : host
  return (action, extra = '') =>
    axios.get(`${base}/player_api.php?username=${username}&password=${password}&action=${action}${extra}`, { timeout: 15000 })
}

export async function authenticate(host, username, password) {
  const get = api(host, username, password)
  const res = await get('get_live_categories')
  // If we got a response without error, auth succeeded
  return { success: true }
}

export async function fetchAll(library) {
  const { host, username, password } = library
  const get = api(host, username, password)
  const base = host.endsWith('/') ? host.slice(0, -1) : host

  const [liveCats, vodCats, seriesCats] = await Promise.all([
    get('get_live_categories').catch(() => ({ data: [] })),
    get('get_vod_categories').catch(() => ({ data: [] })),
    get('get_series_categories').catch(() => ({ data: [] }))
  ])

  const [liveStreams, vodStreams, seriesList] = await Promise.all([
    get('get_live_streams').catch(() => ({ data: [] })),
    get('get_vod_streams').catch(() => ({ data: [] })),
    get('get_series').catch(() => ({ data: [] }))
  ])

  const catMap = {}
  for (const c of [...liveCats.data, ...vodCats.data, ...seriesCats.data]) {
    catMap[c.category_id] = c.category_name
  }

  const live = (liveStreams.data || []).map(s => ({
    id: `xt_live_${s.stream_id}`,
    name: s.name,
    logo: s.stream_icon,
    group: catMap[s.category_id] || 'Live TV',
    url: `${base}/live/${username}/${password}/${s.stream_id}.m3u8`,
    type: 'live',
    streamId: s.stream_id
  }))

  const movies = (vodStreams.data || []).map(s => ({
    id: `xt_vod_${s.stream_id}`,
    name: s.name,
    logo: s.stream_icon,
    group: catMap[s.category_id] || 'Movies',
    url: `${base}/movie/${username}/${password}/${s.stream_id}.${s.container_extension || 'mp4'}`,
    type: 'movie',
    streamId: s.stream_id,
    rating: s.rating,
    plot: s.plot,
    year: s.year,
    duration: s.duration
  }))

  const series = (seriesList.data || []).map(s => ({
    id: `xt_series_${s.series_id}`,
    name: s.name,
    logo: s.cover,
    group: catMap[s.category_id] || 'Series',
    url: null,
    type: 'series',
    seriesId: s.series_id,
    rating: s.rating,
    plot: s.plot,
    year: s.year,
    host,
    username,
    password
  }))

  return [...live, ...movies, ...series]
}

export async function getSeriesInfo(host, username, password, seriesId) {
  const get = api(host, username, password)
  const base = host.endsWith('/') ? host.slice(0, -1) : host
  const res = await get('get_series_info', `&series_id=${seriesId}`)
  const data = res.data
  const seasons = {}

  for (const [seasonNum, episodes] of Object.entries(data.episodes || {})) {
    seasons[seasonNum] = episodes.map(ep => ({
      id: `ep_${ep.id}`,
      episodeNum: ep.episode_num,
      title: ep.title,
      plot: ep.info?.plot,
      duration: ep.info?.duration,
      url: `${base}/series/${username}/${password}/${ep.id}.${ep.container_extension || 'mkv'}`
    }))
  }

  return { info: data.info, seasons }
}
