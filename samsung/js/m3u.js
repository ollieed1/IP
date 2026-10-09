/**
 * m3u.js — M3U/M3U8 playlist parser (fetch-based, no Node.js)
 * Exported as window.M3UParser
 */
const M3UParser = (() => {

  /**
   * Detect content type from URL and group title
   * @param {string} url
   * @param {string} group
   * @returns {'live'|'movie'|'series'}
   */
  function detectType(url, group) {
    const u = (url || '').toLowerCase()
    const g = (group || '').toLowerCase()

    if (u.includes('/movie/') || g.includes('movie') || g.includes('film') || g.includes('vod')) {
      return 'movie'
    }
    if (u.includes('/series/') || g.includes('series') || g.includes('show') || g.includes('episode') || g.includes('tv show')) {
      return 'series'
    }
    // Default: live (covers /live/ urls and uncategorised streams)
    return 'live'
  }

  /**
   * Parse an attribute string from an EXTINF line.
   * Handles both quoted and unquoted values.
   * @param {string} line — the EXTINF line (everything after #EXTINF:)
   * @param {string} attr — attribute name, e.g. 'tvg-name'
   * @returns {string}
   */
  function extractAttr(line, attr) {
    // Match attr="value" or attr=value (no quotes)
    const re = new RegExp(`${attr}="([^"]*)"`, 'i')
    const m = line.match(re)
    if (m) return m[1].trim()
    // Try unquoted
    const re2 = new RegExp(`${attr}=([^\\s,]+)`, 'i')
    const m2 = line.match(re2)
    return m2 ? m2[1].trim() : ''
  }

  /**
   * Parse raw M3U text into an array of item objects.
   * @param {string} text — raw playlist text
   * @returns {Array<{id, name, logo, group, url, type}>}
   */
  function parseText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

    if (!lines[0] || !lines[0].startsWith('#EXTM3U')) {
      throw new Error('Not a valid M3U playlist (missing #EXTM3U header)')
    }

    const items = []
    let currentInfo = null
    let index = 0

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]

      if (line.startsWith('#EXTINF:')) {
        // Strip the prefix, keep everything from the colon onward
        const info = line.substring('#EXTINF:'.length)
        currentInfo = info
      } else if (line.startsWith('#')) {
        // Other directives — skip
        continue
      } else if (line.length > 0) {
        // This is a URL line
        const url = line

        if (currentInfo !== null) {
          // Extract the display name (text after the last comma on the EXTINF line)
          const commaIdx = currentInfo.lastIndexOf(',')
          const displayName = commaIdx >= 0
            ? currentInfo.substring(commaIdx + 1).trim()
            : ''

          const name    = extractAttr(currentInfo, 'tvg-name') || displayName || `Channel ${index + 1}`
          const logo    = extractAttr(currentInfo, 'tvg-logo')
          const group   = extractAttr(currentInfo, 'group-title')
          const tvgId   = extractAttr(currentInfo, 'tvg-id')
          const type    = detectType(url, group)

          items.push({
            id:    tvgId || `${type}_${index}`,
            name,
            logo,
            group,
            url,
            type,
          })

          index++
          currentInfo = null
        }
      }
    }

    return items
  }

  /**
   * Fetch a playlist URL and parse it.
   * @param {string} url
   * @returns {Promise<Array>}
   */
  async function fetchAndParse(url) {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': '*/*' },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch playlist: HTTP ${response.status} ${response.statusText}`)
    }

    const text = await response.text()
    return parseText(text)
  }

  return {
    fetchAndParse,
    parseText,
  }
})()

window.M3UParser = M3UParser
