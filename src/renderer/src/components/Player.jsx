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
  const progressSaveRef = useRef(null)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Setup HLS
  useEffect(() => {
    if (!nowPlaying?.url) return
    const video = videoRef.current
    const url = nowPlaying.url

    setLoading(true)
    setCurrentTime(0)
    setDuration(0)

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }

    const isHls = url.includes('.m3u8') || url.includes('/live/')
    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 30 })
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Resume from saved position
        const prog = watchProgress[nowPlaying.id]
        if (prog && prog.position > 10) video.currentTime = prog.position
        video.play().catch(() => {})
      })
      hlsRef.current = hls
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      video.addEventListener('loadedmetadata', () => {
        const prog = watchProgress[nowPlaying.id]
        if (prog && prog.position > 10) video.currentTime = prog.position
        video.play().catch(() => {})
      }, { once: true })
    } else {
      video.src = url
      const prog = watchProgress[nowPlaying.id]
      if (prog && prog.position > 10) video.currentTime = prog.position
      video.play().catch(() => {})
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
    }
  }, [nowPlaying?.id, nowPlaying?.url])

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onWaiting = () => setLoading(true)
    const onPlaying = () => setLoading(false)
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1))
      }
    }
    const onDurationChange = () => setDuration(video.duration)
    const onVolumeChange = () => { setVolume(video.volume); setMuted(video.muted) }
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('durationchange', onDurationChange)
    video.addEventListener('volumechange', onVolumeChange)
    document.addEventListener('fullscreenchange', onFullscreenChange)

    // Save progress every 5s
    progressSaveRef.current = setInterval(() => {
      if (video.currentTime > 5 && video.duration) {
        updateProgress(nowPlaying.id, video.currentTime, video.duration)
      }
    }, 5000)

    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('durationchange', onDurationChange)
      video.removeEventListener('volumechange', onVolumeChange)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      clearInterval(progressSaveRef.current)
    }
  }, [nowPlaying?.id])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return
      const video = videoRef.current
      if (!video) return
      switch (e.key) {
        case ' ': e.preventDefault(); video.paused ? video.play() : video.pause(); break
        case 'ArrowLeft': video.currentTime = Math.max(0, video.currentTime - 10); break
        case 'ArrowRight': video.currentTime = Math.min(video.duration, video.currentTime + 10); break
        case 'ArrowUp': video.volume = Math.min(1, video.volume + 0.1); break
        case 'ArrowDown': video.volume = Math.max(0, video.volume - 0.1); break
        case 'f': case 'F': toggleFullscreen(); break
        case 'Escape': if (!document.fullscreenElement) handleClose(); break
        case 'm': case 'M': video.muted = !video.muted; break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => {
      if (playing) setShowControls(false)
    }, 3000)
  }, [playing])

  const togglePlayPause = () => {
    const video = videoRef.current
    if (!video) return
    video.paused ? video.play() : video.pause()
  }

  const seek = (seconds) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds))
  }

  const handleTimelineClick = (e) => {
    const video = videoRef.current
    if (!video || !video.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    video.currentTime = pct * video.duration
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const handleClose = () => {
    const video = videoRef.current
    if (video && video.currentTime > 5 && video.duration) {
      updateProgress(nowPlaying.id, video.currentTime, video.duration)
    }
    video?.pause()
    clearNowPlaying()
  }

  // Next episode (for series)
  const nextItem = (() => {
    if (!nowPlaying || nowPlaying.type === 'live') return null
    const idx = content.findIndex(c => c.id === nowPlaying.id)
    return idx >= 0 && idx < content.length - 1 ? content[idx + 1] : null
  })()

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0

  return (
    <div className={`player-container ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="player-card" onMouseMove={resetControlsTimer}>
        {/* Thumbnail + Info */}
        <div className="player-header">
          <div className="player-thumb">
            {nowPlaying.logo ? (
              <img src={nowPlaying.logo} alt={nowPlaying.name} draggable={false} />
            ) : (
              <div className="player-thumb-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="13" rx="2"/></svg>
              </div>
            )}
          </div>
          <div className="player-info">
            <span className="player-title">{nowPlaying.name}</span>
            <span className="player-subtitle">{nowPlaying.group}</span>
          </div>
          <button className="player-close" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6z"/></svg>
          </button>
        </div>

        {/* Video (hidden, audio only UX here — full screen for video) */}
        <video ref={videoRef} className="player-video" playsInline />

        {/* Controls */}
        <div className="player-controls">
          <div className="ctrl-row ctrl-transport">
            <button className="ctrl-btn" onClick={() => seek(-10)}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 12L20 6v12zM4 6v12h2V6z"/></svg>
            </button>
            <button className="ctrl-btn ctrl-play" onClick={togglePlayPause}>
              {loading ? (
                <div className="ctrl-spinner" />
              ) : playing ? (
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7z"/></svg>
              )}
            </button>
            <button className="ctrl-btn" onClick={() => seek(10)}>
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 12L4 6v12zM18 6v12h2V6z"/></svg>
            </button>
            {nextItem && (
              <button className="ctrl-btn ctrl-next" onClick={() => setNowPlaying(nextItem)} title="Next">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/></svg>
              </button>
            )}
          </div>

          {/* Timeline */}
          <div className="ctrl-timeline" onClick={handleTimelineClick}>
            <div className="timeline-track">
              <div className="timeline-buffered" style={{ width: `${bufferedPct}%` }} />
              <div className="timeline-progress" style={{ width: `${progress}%` }} />
              <div className="timeline-thumb" style={{ left: `${progress}%` }} />
            </div>
            <div className="timeline-times">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume + Fullscreen */}
          <div className="ctrl-row ctrl-bottom">
            <button className="ctrl-btn ctrl-sm" onClick={() => { videoRef.current.muted = !muted }}>
              {muted || volume === 0 ? (
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
              ) : volume < 0.5 ? (
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 12c0-1.77-1-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
              )}
            </button>
            <input
              type="range" min="0" max="1" step="0.01"
              value={muted ? 0 : volume}
              className="ctrl-volume"
              onChange={e => {
                videoRef.current.volume = parseFloat(e.target.value)
                videoRef.current.muted = false
              }}
            />
            <div className="ctrl-spacer" />
            <button className="ctrl-btn ctrl-sm" onClick={toggleFullscreen} title="Fullscreen (F)">
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
