import axios from 'axios'

function attr(line, key) {
  const match = line.match(new RegExp(`${key}="([^"]*)"`, 'i'))
  return match ? match[1] : ''
}

export async function parseM3UFromUrl(url) {
  const res = await axios.get(url, { responseType: 'text', timeout: 15000 })
  return parseM3UText(res.data)
}

export function parseM3UText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const items = []
  let current = null
  let idCounter = 0

  for (const line of lines) {
    if (line.startsWith('#EXTINF')) {
      const name = line.includes(',') ? line.split(',').slice(1).join(',').trim() : ''
      current = {
        id: `m3u_${idCounter++}`,
        name: attr(line, 'tvg-name') || name,
        logo: attr(line, 'tvg-logo'),
        group: attr(line, 'group-title') || 'Uncategorised',
        tvgId: attr(line, 'tvg-id'),
        type: 'live'
      }
    } else if (line.startsWith('http') && current) {
      current.url = line
      // Guess type from URL or group name
      const g = current.group.toLowerCase()
      const u = line.toLowerCase()
      if (u.includes('/movie/') || g.includes('movie') || g.includes('film') || g.includes('vod')) {
        current.type = 'movie'
      } else if (u.includes('/series/') || g.includes('series') || g.includes('show')) {
        current.type = 'series'
      }
      items.push(current)
      current = null
    }
  }

  return items
}
