/**
 * app.js — Main application controller
 * Manages screens, routing, content loading, and key handling.
 */
;(function () {

  // ═══════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════

  const state = {
    currentSection:  'live',   // 'live' | 'movie' | 'series'
    currentCategory: null,
    allContent:      [],       // flat array of all items from Storage
    categories:      [],       // derived category list for current section
    filteredItems:   [],       // items for current category
  }

  // ═══════════════════════════════════════════════
  // Screen routing
  // ═══════════════════════════════════════════════

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
    const screen = document.getElementById(id)
    if (screen) screen.classList.add('active')
    // Defer focusFirst so the DOM has time to repaint
    requestAnimationFrame(() => Nav.focusFirst())
  }

  function handleBack() {
    const activeId = document.querySelector('.screen.active')?.id
    switch (activeId) {
      case 'screen-browse':
        showScreen('screen-home')
        break
      case 'screen-setup':
        // Only go back if we have libraries (don't trap user)
        if (Storage.getLibraries().length > 0) {
          showScreen('screen-home')
        }
        break
      case 'screen-home':
        // Exit app on Samsung TV
        try { tizen.application.getCurrentApplication().exit() } catch {}
        break
      default:
        break
    }
  }

  // ═══════════════════════════════════════════════
  // Clock
  // ═══════════════════════════════════════════════

  function updateClock() {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const clockEls = document.querySelectorAll('#clock, #home-clock')
    clockEls.forEach(el => { if (el) el.textContent = time })
  }

  // ═══════════════════════════════════════════════
  // Home screen
  // ═══════════════════════════════════════════════

  const HOME_SECTIONS = [
    {
      id:    'live',
      label: 'Live TV',
      desc:  'Browse live channels',
      icon:  `<svg class="home-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>`,
    },
    {
      id:    'movie',
      label: 'Movies',
      desc:  'On-demand films',
      icon:  `<svg class="home-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M7 4v16M17 4v16M2 9h20M2 15h20M7 9l-4-5M7 15l-4 5M17 9l4-5M17 15l4 5"/>
              </svg>`,
    },
    {
      id:    'series',
      label: 'Series',
      desc:  'TV shows & seasons',
      icon:  `<svg class="home-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="12" rx="2"/>
                <path d="M3 19h18M7 15v4M17 15v4M9 8l5 3-5 3V8z" fill="currentColor" stroke="none"/>
                <path d="M9 8l5 3-5 3V8z"/>
              </svg>`,
    },
    {
      id:    'settings',
      label: 'Add Library',
      desc:  'Connect M3U or Xtream',
      icon:  `<svg class="home-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14M12 2v2M12 20v2M2 12h2M20 12h2"/>
              </svg>`,
    },
  ]

  function renderHome() {
    const container = document.getElementById('home-cards')
    if (!container) return

    container.innerHTML = HOME_SECTIONS.map(s => `
      <div
        class="home-card${s.id === 'settings' ? ' home-card--settings' : ''}"
        data-focusable
        data-action="${s.id}"
        role="button"
        tabindex="-1"
        aria-label="${s.label}"
      >
        ${s.icon}
        <div class="home-card__label">${s.label}</div>
        <div class="home-card__desc">${s.desc}</div>
      </div>
    `).join('')

    // Attach click handlers
    container.querySelectorAll('[data-action]').forEach(card => {
      card.addEventListener('click', () => {
        const action = card.dataset.action
        if (action === 'settings') {
          showScreen('screen-setup')
        } else {
          browseTo(action)
        }
      })
    })
  }

  // ═══════════════════════════════════════════════
  // Browse screen
  // ═══════════════════════════════════════════════

  const SKIP_GROUP_PATTERNS = [
    /24[\/-]?7/i,
    /^\s*$/,
  ]

  function shouldSkipGroup(name) {
    return SKIP_GROUP_PATTERNS.some(p => p.test(name))
  }

  function browseTo(section) {
    state.currentSection = section
    Storage.setLastSection(section)

    // Reload content from storage (may have been updated)
    state.allContent = Storage.getAllContent()

    // Update breadcrumb
    const bc = document.getElementById('browse-breadcrumb')
    if (bc) {
      bc.textContent = section === 'live' ? 'Live TV'
        : section === 'movie' ? 'Movies'
        : 'Series'
    }

    // Build category list
    const sectionItems = state.allContent.filter(item => item.type === section)
    const groupSet = new Set()
    sectionItems.forEach(item => {
      if (item.group && !shouldSkipGroup(item.group)) {
        groupSet.add(item.group)
      }
    })

    // Add an "All" category at the top
    state.categories = ['All', ...Array.from(groupSet).sort()]

    // Restore last category or default to All
    const lastCat = Storage.getLastCategory(section)
    state.currentCategory = (lastCat && state.categories.includes(lastCat))
      ? lastCat
      : 'All'

    renderRail()
    renderGrid(state.currentCategory)
    showScreen('screen-browse')
  }

  function renderRail() {
    const rail = document.getElementById('browse-rail')
    if (!rail) return

    rail.innerHTML = state.categories.map(cat => `
      <div
        class="category-item${cat === state.currentCategory ? ' active' : ''}"
        data-focusable
        data-category="${escapeAttr(cat)}"
        role="option"
        aria-selected="${cat === state.currentCategory}"
        tabindex="-1"
      >${escapeHtml(cat)}</div>
    `).join('')

    rail.querySelectorAll('[data-category]').forEach(item => {
      item.addEventListener('click', () => {
        const cat = item.dataset.category
        selectCategory(cat)
      })
    })
  }

  function selectCategory(cat) {
    state.currentCategory = cat
    Storage.setLastCategory(state.currentSection, cat)

    // Update active state in rail
    document.querySelectorAll('.category-item').forEach(el => {
      const isCat = el.dataset.category === cat
      el.classList.toggle('active', isCat)
      el.setAttribute('aria-selected', isCat)
    })

    renderGrid(cat)
  }

  function renderGrid(category) {
    const grid = document.getElementById('channel-grid')
    if (!grid) return

    const section = state.currentSection
    let items = state.allContent.filter(item => item.type === section)

    if (category && category !== 'All') {
      items = items.filter(item => item.group === category)
    }

    state.filteredItems = items

    if (items.length === 0) {
      grid.innerHTML = '<div class="grid-message">No content in this category</div>'
      requestAnimationFrame(() => Nav.focusFirst())
      return
    }

    if (section === 'live') {
      grid.innerHTML = items.map((item, i) => renderChannelCard(item, i)).join('')
    } else {
      grid.innerHTML = items.map((item, i) => renderVodCard(item, i)).join('')
    }

    grid.querySelectorAll('[data-item-id]').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.itemId
        const item = state.filteredItems.find(it => it.id === id)
        if (item) {
          if (item.url) {
            Player.play(item)
            showScreen('screen-player')
          } else {
            console.warn('[App] Item has no URL:', item.name)
          }
        }
      })
    })

    // Focus the grid after rendering
    requestAnimationFrame(() => {
      const firstCard = grid.querySelector('[data-focusable]')
      if (firstCard) Nav.setFocus(firstCard)
    })
  }

  function renderChannelCard(item, i) {
    const initials = (item.name || '?').substring(0, 2).toUpperCase()
    const logoHtml = item.logo
      ? `<img class="channel-card__logo" src="${escapeAttr(item.logo)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        + `<div class="channel-card__logo-placeholder" style="display:none">${escapeHtml(initials)}</div>`
      : `<div class="channel-card__logo-placeholder">${escapeHtml(initials)}</div>`

    return `
      <div
        class="channel-card"
        data-focusable
        data-item-id="${escapeAttr(item.id)}"
        role="button"
        tabindex="-1"
        aria-label="${escapeAttr(item.name)}"
      >
        <div class="channel-card__logo-wrap">${logoHtml}</div>
        <div class="channel-card__name">${escapeHtml(item.name)}</div>
      </div>
    `
  }

  function renderVodCard(item, i) {
    const posterHtml = item.logo
      ? `<img class="vod-card__poster" src="${escapeAttr(item.logo)}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='${renderPosterPlaceholderInline(item.name)}'">`
      : `<div class="vod-card__poster-placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.5"><rect x="3" y="3" width="18" height="12" rx="2"/><path d="M9 8l5 3-5 3V8z"/></svg></div>`

    return `
      <div
        class="vod-card"
        data-focusable
        data-item-id="${escapeAttr(item.id)}"
        role="button"
        tabindex="-1"
        aria-label="${escapeAttr(item.name)}"
      >
        <div class="vod-card__poster-wrap">${posterHtml}</div>
        <div class="vod-card__title">${escapeHtml(item.name)}</div>
      </div>
    `
  }

  function renderPosterPlaceholderInline(name) {
    return `<div class='vod-card__poster-placeholder'><svg width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='#555' stroke-width='1.5'><rect x='3' y='3' width='18' height='12' rx='2'/><path d='M9 8l5 3-5 3V8z'/></svg></div>`
  }

  // ═══════════════════════════════════════════════
  // Setup screen
  // ═══════════════════════════════════════════════

  function initSetupScreen() {
    // Tab switching
    document.querySelectorAll('.setup-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab

        document.querySelectorAll('.setup-tab').forEach(t => {
          t.classList.toggle('active', t.dataset.tab === target)
          t.setAttribute('aria-selected', t.dataset.tab === target)
        })
        document.querySelectorAll('.setup-panel').forEach(p => {
          p.classList.toggle('active', p.id === `panel-${target}`)
        })
        Nav.focusFirst()
      })
    })

    // M3U form
    const btnM3u = document.getElementById('btn-m3u-submit')
    if (btnM3u) btnM3u.addEventListener('click', handleM3uSubmit)

    const btnM3uCancel = document.getElementById('btn-m3u-cancel')
    if (btnM3uCancel) btnM3uCancel.addEventListener('click', () => {
      if (Storage.getLibraries().length > 0) showScreen('screen-home')
    })

    // Xtream form
    const btnXt = document.getElementById('btn-xt-submit')
    if (btnXt) btnXt.addEventListener('click', handleXtreamSubmit)

    const btnXtCancel = document.getElementById('btn-xt-cancel')
    if (btnXtCancel) btnXtCancel.addEventListener('click', () => {
      if (Storage.getLibraries().length > 0) showScreen('screen-home')
    })
  }

  async function handleM3uSubmit() {
    const name   = document.getElementById('m3u-name').value.trim() || 'My IPTV'
    const url    = document.getElementById('m3u-url').value.trim()
    const status = document.getElementById('m3u-status')

    if (!url) {
      setStatus(status, 'error', 'Please enter a playlist URL')
      return
    }

    setStatus(status, 'loading', '<span class="spinner"></span>Loading playlist…')
    Nav.disable()

    try {
      const items = await M3UParser.fetchAndParse(url)
      if (!items || items.length === 0) {
        throw new Error('No channels found in playlist')
      }

      const lib = {
        id:   `m3u_${Date.now()}`,
        name,
        type: 'm3u',
        url,
        addedAt: Date.now(),
      }
      Storage.addLibrary(lib)
      Storage.saveContent(lib.id, items)

      setStatus(status, 'success', `Loaded ${items.length} items`)

      setTimeout(() => {
        Nav.enable()
        showScreen('screen-home')
        renderHome()
      }, 1200)

    } catch (err) {
      console.error('[Setup] M3U error:', err)
      setStatus(status, 'error', `Error: ${err.message}`)
      Nav.enable()
    }
  }

  async function handleXtreamSubmit() {
    const name   = document.getElementById('xt-name').value.trim() || 'My IPTV'
    const server = document.getElementById('xt-server').value.trim()
    const user   = document.getElementById('xt-user').value.trim()
    const pass   = document.getElementById('xt-pass').value.trim()
    const status = document.getElementById('xt-status')

    if (!server || !user || !pass) {
      setStatus(status, 'error', 'Please fill in all fields')
      return
    }

    setStatus(status, 'loading', '<span class="spinner"></span>Authenticating…')
    Nav.disable()

    try {
      await XtreamClient.authenticate(server, user, pass)
      setStatus(status, 'loading', '<span class="spinner"></span>Fetching content…')

      const items = await XtreamClient.fetchAll(server, user, pass)

      const lib = {
        id:     `xt_${Date.now()}`,
        name,
        type:   'xtream',
        server,
        username: user,
        password: pass,
        addedAt: Date.now(),
      }
      Storage.addLibrary(lib)
      Storage.saveContent(lib.id, items)

      setStatus(status, 'success', `Connected — ${items.length} items loaded`)

      setTimeout(() => {
        Nav.enable()
        showScreen('screen-home')
        renderHome()
      }, 1200)

    } catch (err) {
      console.error('[Setup] Xtream error:', err)
      setStatus(status, 'error', `Error: ${err.message}`)
      Nav.enable()
    }
  }

  function setStatus(el, type, html) {
    if (!el) return
    el.className = `setup-status ${type}`
    el.innerHTML = html
  }

  // ═══════════════════════════════════════════════
  // Key handler
  // ═══════════════════════════════════════════════

  document.addEventListener('keydown', e => {
    const activeId = document.querySelector('.screen.active')?.id

    // ── Player screen ───────────────────────────
    if (activeId === 'screen-player') {
      Player.showControls()
      switch (e.keyCode) {
        case 13:    // OK/Enter
        case 10252: // Play/Pause toggle (some Samsung remotes)
        case 415:   // Play
        case 19:    // Pause
          Player.togglePlay()
          break
        case 37:    // Left arrow
        case 412:   // Rewind
          Player.seek(-10)
          break
        case 39:    // Right arrow
        case 417:   // FastForward
          Player.seek(30)
          break
        case 38:    // Up — show controls only
        case 40:    // Down — show controls only
          break
        case 10009: // Samsung Back
        case 27:    // Escape
          Player.stop()
          showScreen('screen-browse')
          break
        case 413:   // Stop
          Player.stop()
          showScreen('screen-browse')
          break
      }
      e.preventDefault()
      return
    }

    // ── Setup screen — allow text input ─────────
    if (activeId === 'screen-setup') {
      const focused = Nav.getCurrent()
      const isInput = focused && (focused.tagName === 'INPUT')

      // Let the browser handle character input in text fields
      if (isInput) {
        switch (e.keyCode) {
          case 38: Nav.move('up');    e.preventDefault(); break
          case 40: Nav.move('down');  e.preventDefault(); break
          case 13: Nav.select();      e.preventDefault(); break
          case 10009: case 27: handleBack(); e.preventDefault(); break
          // All other keys (including letters/numbers): pass through to input
        }
        return
      }
    }

    // ── All other screens: full D-pad navigation ─
    switch (e.keyCode) {
      case 37:   Nav.move('left');  break
      case 38:   Nav.move('up');    break
      case 39:   Nav.move('right'); break
      case 40:   Nav.move('down');  break
      case 13:   Nav.select();      break
      case 10009:
      case 27:   handleBack();      break
    }
    e.preventDefault()
  })

  // ═══════════════════════════════════════════════
  // Utility: HTML escaping
  // ═══════════════════════════════════════════════

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function escapeAttr(str) {
    return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }

  // ═══════════════════════════════════════════════
  // Boot
  // ═══════════════════════════════════════════════

  function boot() {
    // Register tizen key events (safe — wrapped in try-catch)
    try {
      tizen.tvinputdevice.registerKey('MediaPlay')
      tizen.tvinputdevice.registerKey('MediaPause')
      tizen.tvinputdevice.registerKey('MediaStop')
      tizen.tvinputdevice.registerKey('MediaFastForward')
      tizen.tvinputdevice.registerKey('MediaRewind')
    } catch {}

    // Init player with video element and close callback
    const videoEl = document.getElementById('player-video')
    if (videoEl) {
      Player.init(videoEl, () => {
        // Player closed: return to browse (or home if no content)
        if (state.allContent.length > 0) {
          showScreen('screen-browse')
        } else {
          showScreen('screen-home')
        }
      })
    }

    // Init setup screen event handlers
    initSetupScreen()

    // Render home cards
    renderHome()

    // Clock: initial update + interval
    updateClock()
    setInterval(updateClock, 30000)

    // Decide initial screen
    const libs = Storage.getLibraries()
    if (libs.length === 0) {
      showScreen('screen-setup')
    } else {
      state.allContent = Storage.getAllContent()
      showScreen('screen-home')
    }
  }

  // Wait for all deferred scripts to have loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }

})()
