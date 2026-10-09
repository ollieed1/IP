import React, { useEffect, useState } from 'react'
import useStore from '../store/useStore'

export default function SeriesDetail() {
  const { seriesDetail, setSeriesDetail, setNowPlaying } = useStore()
  const [seasons, setSeasons] = useState({})
  const [activeSeason, setActiveSeason] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!seriesDetail?.seriesId) { setLoading(false); return }
    setLoading(true)
    window.api.getSeriesInfo({
      host: seriesDetail.host,
      username: seriesDetail.username,
      password: seriesDetail.password,
      seriesId: seriesDetail.seriesId
    }).then(data => {
      setSeasons(data.seasons || {})
      const keys = Object.keys(data.seasons || {})
      if (keys.length > 0) setActiveSeason(keys[0])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [seriesDetail?.seriesId])

  const episodes = activeSeason ? (seasons[activeSeason] || []) : []

  return (
    <div className="modal-overlay" onClick={() => setSeriesDetail(null)}>
      <div className="modal series-modal" onClick={e => e.stopPropagation()}>
        <div className="series-hero">
          {seriesDetail.logo && <img src={seriesDetail.logo} alt={seriesDetail.name} className="series-hero-img" draggable={false} />}
          <div className="series-hero-info">
            <h2 className="series-hero-title">{seriesDetail.name}</h2>
            {seriesDetail.year && <span className="series-hero-year">{seriesDetail.year}</span>}
            {seriesDetail.plot && <p className="series-hero-plot">{seriesDetail.plot}</p>}
          </div>
          <button className="modal-close" onClick={() => setSeriesDetail(null)}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6z"/></svg>
          </button>
        </div>

        {loading ? (
          <div className="loading" style={{ height: 120 }}><div className="spinner" /></div>
        ) : (
          <>
            {Object.keys(seasons).length > 1 && (
              <div className="season-tabs">
                {Object.keys(seasons).map(s => (
                  <button
                    key={s}
                    className={`season-tab ${activeSeason === s ? 'active' : ''}`}
                    onClick={() => setActiveSeason(s)}
                  >Season {s}</button>
                ))}
              </div>
            )}
            <div className="episode-list">
              {episodes.map(ep => (
                <div key={ep.id} className="episode-row" onClick={() => {
                  setNowPlaying({ ...ep, name: `${seriesDetail.name} · S${activeSeason}E${ep.episodeNum}`, type: 'episode', logo: seriesDetail.logo })
                  setSeriesDetail(null)
                }}>
                  <div className="ep-number">E{ep.episodeNum}</div>
                  <div className="ep-info">
                    <span className="ep-title">{ep.title || `Episode ${ep.episodeNum}`}</span>
                    {ep.duration && <span className="ep-duration">{ep.duration}</span>}
                  </div>
                  <svg className="row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              ))}
              {episodes.length === 0 && (
                <p className="empty-text">No episodes available</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
