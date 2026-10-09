import React, { useRef, useEffect, useState, useCallback } from 'react'
import Hls from 'hls.js'
import useStore from '../store/useStore'

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`
}

export default function Player() {
  const { nowPlaying, clearNowPlaying, updateProgress, watchProgress, content, setNowPlaying } = useStore()
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const controlsTimerRef = useRef(null)
  const saveTimerRef = useRef(null)
  const overlayRef = useRef(null)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState(null)

  // Load stream
  useEffect(() => {
    if (!nowPlaying?.url) return
    const video = videoRef.current
    const url = nowPlaying.url

    setLoading(true)
    setError(null)
    setCurrentTime(0)
    setDuration(0)
    setPlaying(false)

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }

    const resume = () => {
      const prog = watchProgress[nowPlaying.id]
      if (prog?.position > 10 && prog?.duration) {
        video.currentTime = prog.position
      }
      video.play().catch(() => {})
    }

    const isHls = url.includes('.m3u8') || url.includes('/live/')

    // Containers that commonly have AC3/EAC3 audio — needs ffmpeg proxy
    const needsProxy = !isHls && (
      /\.(mkv|ts|m2ts|avi|wmv)(\?|$)/i.test(url) ||
      url.includes('/series/')
    )

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 30, startLevel: -1 })
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, resume)
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) setError('Stream unavailable')
      })
      hlsRef.current = hls
    } else if (needsProxy && window.api?.proxyStream) {
      // Route through ffmpeg proxy to transcode AC3 → AAC
      window.api.proxyStream(url).then(({ url: proxyUrl, ffmpegAvailable }) => {
        if (proxyUrl) {
          video.src = proxyUrl
          video.addEventListener('canplay', resume, { once: true })
        } else {
          // ffmpeg not installed — fall back to direct and warn
          console.warn('ffmpeg unavailable, trying direct playback')
          if (!ffmpegAvailable) setError('Install ffmpeg for audio: brew install ffmpeg')
          video.src = url
          video.addEventListener('canplay', resume, { once: true })
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      video.addEventListener('loadedmetadata', resume, { once: true })
    } else {
      video.src = url
      video.addEventListener('canplay', resume, { once: true })
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
      video.src = ''
    }
  }, [nowPlaying?.id, nowPlaying?.url])

  // Video events
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlers = {
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
      waiting: () => setLoading(true),
      playing: () => setLoading(false),
      canplay: () => setLoading(false),
      timeupdate: () => {
        setCurrentTime(video.currentTime)
        if (video.buffered.length > 0) setBuffered(video.buffered.end(video.buffered.length - 1))
      },
      durationchange: () => setDuration(video.duration),
      volumechange: () => { setVolume(video.volume); setMuted(video.muted) },
      error: () => setError('Failed to load stream'),
    }

    for (const [e, fn] of Object.entries(handlers)) video.addEventListener(e, fn)

    const onFS = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFS)

    // Save progress every 5s
    saveTimerRef.current = setInterval(() => {
      if (video.currentTime > 5 && video.duration) {
        updateProgress(nowPlaying.id, video.currentTime, video.duration)
      }
    }, 5000)

    return () => {
      for (const [e, fn] of Object.entries(handlers)) video.removeEventListener(e, fn)
      document.removeEventListener('fullscreenchange', onFS)
      clearInterval(saveTimerRef.current)
    }
  }, [nowPlaying?.id])

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return
      const video = videoRef.current
      if (!video) return
      switch (e.key) {
        case ' ': e.preventDefault(); video.paused ? video.play() : video.pause(); break
        case 'ArrowLeft': video.currentTime = Math.max(0, video.currentTime - 10); break
        case 'ArrowRight': video.currentTime = Math.min(video.duration || 0, video.currentTime + 10); break
        case 'ArrowUp': e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); break
        case 'ArrowDown': e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); break
        case 'f': case 'F': toggleFullscreen(); break
        case 'm': case 'M': video.muted = !video.muted; break
        case 'Escape':
          if (document.fullscreenElement) document.exitFullscreen()
          else handleClose()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  const togglePlayPause = () => {
    const v = videoRef.current
    v?.paused ? v.play() : v?.pause()
  }

  const seek = (seconds) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds))
  }

  const handleScrub = (e) => {
    const v = videoRef.current
    if (!v?.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      overlayRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const handleClose = () => {
    const v = videoRef.current
    if (v?.currentTime > 5 && v?.duration) {
      updateProgress(nowPlaying.id, v.currentTime, v.duration)
    }
    v?.pause()
    clearNowPlaying()
  }

  const nextItem = (() => {
    if (!nowPlaying || nowPlaying.type === 'live') return null
    const idx = content.findIndex(c => c.id === nowPlaying.id)
    return idx >= 0 && idx < content.length - 1 ? content[idx + 1] : null
  })()

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0

  return (
    <div
      ref={overlayRef}
      className={`player-overlay ${isFullscreen ? 'is-fullscreen' : ''}`}
      onMouseMove={resetControlsTimer}
      onMouseEnter={() => setShowControls(true)}
    >
      {/* Video */}
      <video ref={videoRef} className="player-video" playsInline />

      {/* Buffering spinner */}
      {loading && !error && (
        <div className="player-spinner-wrap">
          <div className="player-spinner" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="player-error">
          <span>{error}</span>
          <button onClick={handleClose}>Close</button>
        </div>
      )}

      {/* Controls overlay */}
      <div className={`player-controls-overlay ${showControls || !playing ? 'visible' : ''}`}>
        {/* Top bar: title + close */}
        <div className="pco-top">
          <div className="pco-title-group">
            {nowPlaying.logo && (
              <img className="pco-thumb" src={nowPlaying.logo} alt="" draggable={false} />
            )}
            <div>
              <div className="pco-title">{nowPlaying.name}</div>
              <div className="pco-subtitle">{nowPlaying.group}</div>
            </div>
          </div>
          <button className="pco-close" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6z"/></svg>
          </button>
        </div>

        {/* Bottom bar: transport + timeline */}
        <div className="pco-bottom">
          {/* Timeline */}
          <div className="pco-timeline" onClick={handleScrub}>
            <div className="pco-track">
              <div className="pco-buffered" style={{ width: `${bufferedPct}%` }} />
              <div className="pco-progress" style={{ width: `${progress}%` }} />
              <div className="pco-thumb-dot" style={{ left: `${progress}%` }} />
            </div>
            <div className="pco-times">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Transport */}
          <div className="pco-transport">
            <div className="pco-left">
              <button className="pco-btn" onClick={() => seek(-10)} title="−10s">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 12L20 6v12zM4 6v12h2V6z"/></svg>
              </button>
              <button className="pco-btn pco-play" onClick={togglePlayPause}>
                {loading ? <div className="pco-loading-dot" /> :
                  playing
                    ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>
                    : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7z"/></svg>
                }
              </button>
              <button className="pco-btn" onClick={() => seek(10)} title="+10s">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 12L4 6v12zM18 6v12h2V6z"/></svg>
              </button>
              {nextItem && (
                <button className="pco-btn pco-next" onClick={() => setNowPlaying(nextItem)} title="Next episode">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/></svg>
                </button>
              )}
              <button className="pco-btn pco-mute" onClick={() => { videoRef.current.muted = !muted }}>
                {muted || volume === 0
                  ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                  : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                }
              </button>
              <input
                type="range" min="0" max="1" step="0.01"
                value={muted ? 0 : volume}
                className="pco-volume"
                onChange={e => { videoRef.current.volume = parseFloat(e.target.value); videoRef.current.muted = false }}
              />
            </div>

            <div className="pco-right">
              <button className="pco-btn" onClick={toggleFullscreen} title="Fullscreen (F)">
                {isFullscreen
                  ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
                  : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
