/**
 * player.js — HLS.js video player controller
 * Exported as window.Player
 */
const Player = (() => {
  let hls           = null
  let videoEl       = null
  let controlsTimer = null
  let saveTimer     = null
  let currentItem   = null
  let onClose       = null

  // ─── DOM helpers ────────────────────────────────────────────

  function el(id) {
    return document.getElementById(id)
  }

  function formatTime(s) {
    if (!s || isNaN(s) || !isFinite(s)) return '0:00'
    const total = Math.floor(s)
    const h   = Math.floor(total / 3600)
    const m   = Math.floor((total % 3600) / 60)
    const sec = total % 60
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    }
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  // ─── Progress UI update ─────────────────────────────────────

  function updateProgress() {
    if (!videoEl || !currentItem) return
    const current  = videoEl.currentTime  || 0
    const duration = videoEl.duration     || 0
    const pct      = duration > 0 ? (current / duration) * 100 : 0

    const fill = el('player-progress-fill')
    if (fill) fill.style.width = pct + '%'

    const timeCurrent = el('player-time-current')
    if (timeCurrent) timeCurrent.textContent = formatTime(current)

    const timeTotal = el('player-time-total')
    if (timeTotal) timeTotal.textContent = formatTime(duration)

    // Update play/pause icon
    const iconPlay  = el('icon-play')
    const iconPause = el('icon-pause')
    if (iconPlay && iconPause) {
      iconPlay.style.display  = videoEl.paused ? '' : 'none'
      iconPause.style.display = videoEl.paused ? 'none' : ''
    }
  }

  // ─── Controls visibility ────────────────────────────────────

  function showControls() {
    const controls = el('player-controls')
    if (!controls) return
    controls.classList.add('visible')
    clearTimeout(controlsTimer)
    controlsTimer = setTimeout(() => {
      controls.classList.remove('visible')
    }, 4000)
  }

  function hideControls() {
    clearTimeout(controlsTimer)
    const controls = el('player-controls')
    if (controls) controls.classList.remove('visible')
  }

  // ─── Init ───────────────────────────────────────────────────

  function init(videoElement, closeCallback) {
    videoEl = videoElement
    onClose = closeCallback

    videoEl.addEventListener('timeupdate', () => {
      if (currentItem && videoEl.currentTime > 5) {
        updateProgress()
      }
    })

    videoEl.addEventListener('play', updateProgress)
    videoEl.addEventListener('pause', updateProgress)

    // Wire up the player control buttons
    const btnPlayPause = el('btn-playpause')
    const btnRewind    = el('btn-rewind')
    const btnForward   = el('btn-forward')

    if (btnPlayPause) btnPlayPause.addEventListener('click', () => { togglePlay(); showControls() })
    if (btnRewind)    btnRewind.addEventListener('click', () => { seek(-10); showControls() })
    if (btnForward)   btnForward.addEventListener('click', () => { seek(30); showControls() })

    // Periodic progress save
    saveTimer = setInterval(() => {
      if (currentItem && videoEl.currentTime > 5 && videoEl.duration && isFinite(videoEl.duration)) {
        Storage.setProgress(currentItem.id, videoEl.currentTime, videoEl.duration)
      }
    }, 5000)
  }

  // ─── Play ───────────────────────────────────────────────────

  function play(item) {
    currentItem = item

    // Update UI metadata
    const titleEl    = el('player-title')
    const subtitleEl = el('player-subtitle')
    const thumbEl    = el('player-thumb')

    if (titleEl)    titleEl.textContent    = item.name  || ''
    if (subtitleEl) subtitleEl.textContent = item.group || ''
    if (thumbEl) {
      if (item.logo) {
        thumbEl.src   = item.logo
        thumbEl.style.display = ''
      } else {
        thumbEl.src   = ''
        thumbEl.style.display = 'none'
      }
    }

    // Reset progress UI
    const fill = el('player-progress-fill')
    if (fill) fill.style.width = '0%'
    const timeCurrent = el('player-time-current')
    const timeTotal   = el('player-time-total')
    if (timeCurrent) timeCurrent.textContent = '0:00'
    if (timeTotal)   timeTotal.textContent   = '0:00'

    // Destroy previous HLS instance
    if (hls) {
      hls.destroy()
      hls = null
    }

    const url = item.url

    if (!url) {
      console.error('[Player] No URL for item:', item.name)
      return
    }

    const isHlsUrl = url.includes('.m3u8') || url.includes('/live/') || url.includes('/hls/')

    if (typeof Hls !== 'undefined' && Hls.isSupported() && isHlsUrl) {
      hls = new Hls({
        enableWorker:        true,
        lowLatencyMode:      false,
        backBufferLength:    30,
        maxBufferLength:     60,
        maxMaxBufferLength:  600,
      })
      hls.loadSource(url)
      hls.attachMedia(videoEl)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        resumeOrPlay()
      })
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('[Player] HLS fatal error:', data.type, data.details)
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError()
              break
            default:
              stop()
              break
          }
        }
      })
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl') && isHlsUrl) {
      // Native HLS (Safari / some Samsung Tizen builds)
      videoEl.src = url
      videoEl.addEventListener('loadedmetadata', resumeOrPlay, { once: true })
    } else {
      // Direct playback (MP4, TS, etc.)
      videoEl.src = url
      resumeOrPlay()
    }

    showControls()
  }

  function resumeOrPlay() {
    const prog = Storage.getProgress(currentItem.id)
    if (prog && prog.position > 10) {
      videoEl.currentTime = prog.position
    }
    videoEl.play().catch(err => {
      console.warn('[Player] Autoplay prevented:', err)
    })
  }

  // ─── Controls ───────────────────────────────────────────────

  function togglePlay() {
    if (!videoEl) return
    if (videoEl.paused) {
      videoEl.play().catch(e => console.warn('[Player] play() failed:', e))
    } else {
      videoEl.pause()
    }
    updateProgress()
  }

  function seek(seconds) {
    if (!videoEl) return
    const max = isFinite(videoEl.duration) ? videoEl.duration : 0
    videoEl.currentTime = Math.max(0, Math.min(max, videoEl.currentTime + seconds))
    updateProgress()
    showControls()
  }

  // ─── Stop / cleanup ─────────────────────────────────────────

  function stop() {
    // Save final progress before stopping
    if (currentItem && videoEl && videoEl.currentTime > 5 && videoEl.duration && isFinite(videoEl.duration)) {
      Storage.setProgress(currentItem.id, videoEl.currentTime, videoEl.duration)
    }

    if (videoEl) {
      videoEl.pause()
      videoEl.src = ''
    }

    if (hls) {
      hls.destroy()
      hls = null
    }

    hideControls()
    currentItem = null

    if (onClose) onClose()
  }

  return {
    init,
    play,
    stop,
    togglePlay,
    seek,
    showControls,
    hideControls,
    getCurrentItem: () => currentItem,
  }
})()

window.Player = Player
