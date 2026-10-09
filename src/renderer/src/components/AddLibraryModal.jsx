import React, { useState } from 'react'
import useStore from '../store/useStore'
import api from '../api/index.js'

function generateId() {
  return `lib_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export default function AddLibraryModal() {
  const { setShowAddLibrary, loadLibraries, loadContent, activeSection } = useStore()
  const [tab, setTab] = useState('m3u')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // M3U form
  const [m3uName, setM3uName] = useState('')
  const [m3uUrl, setM3uUrl] = useState('')

  // Xtream form
  const [xtName, setXtName] = useState('')
  const [xtHost, setXtHost] = useState('')
  const [xtUser, setXtUser] = useState('')
  const [xtPass, setXtPass] = useState('')

  const handleSubmitM3U = async (e) => {
    e.preventDefault()
    if (!m3uUrl.trim()) { setError('Please enter a URL'); return }
    setLoading(true); setError('')
    try {
      await api.addLibrary({
        id: generateId(),
        type: 'm3u',
        name: m3uName || 'My Library',
        url: m3uUrl.trim()
      })
      await loadLibraries()
      const type = activeSection === 'live' ? 'live' : activeSection === 'movies' ? 'movie' : 'series'
      await loadContent(type)
      setShowAddLibrary(false)
    } catch (err) {
      setError(err.message || 'Failed to add library')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitXtream = async (e) => {
    e.preventDefault()
    if (!xtHost || !xtUser || !xtPass) { setError('Please fill all fields'); return }
    setLoading(true); setError('')
    try {
      const host = xtHost.trim().replace(/\/$/, '')
      const authResult = await api.testXtreamAuth(host, xtUser, xtPass)
      if (!authResult.success) throw new Error('Authentication failed — check your credentials')

      await api.addLibrary({
        id: generateId(),
        type: 'xtream',
        name: xtName || 'Xtream Library',
        host,
        username: xtUser,
        password: xtPass
      })
      await loadLibraries()
      const type = activeSection === 'live' ? 'live' : activeSection === 'movies' ? 'movie' : 'series'
      await loadContent(type)
      setShowAddLibrary(false)
    } catch (err) {
      setError(err.message || 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={() => setShowAddLibrary(false)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Library</h2>
          <button className="modal-close" onClick={() => setShowAddLibrary(false)}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6z"/></svg>
          </button>
        </div>

        <div className="modal-tabs">
          <button className={`modal-tab ${tab === 'm3u' ? 'active' : ''}`} onClick={() => setTab('m3u')}>M3U URL</button>
          <button className={`modal-tab ${tab === 'xtream' ? 'active' : ''}`} onClick={() => setTab('xtream')}>Xtream Codes</button>
        </div>

        {tab === 'm3u' ? (
          <form className="modal-form" onSubmit={handleSubmitM3U}>
            <div className="form-group">
              <label>Name</label>
              <input type="text" placeholder="My IPTV" value={m3uName} onChange={e => setM3uName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>M3U URL</label>
              <input type="url" placeholder="http://provider.com/get.php?..." value={m3uUrl} onChange={e => setM3uUrl(e.target.value)} required />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Loading playlist…' : 'Add Library'}
            </button>
          </form>
        ) : (
          <form className="modal-form" onSubmit={handleSubmitXtream}>
            <div className="form-group">
              <label>Name</label>
              <input type="text" placeholder="My Provider" value={xtName} onChange={e => setXtName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Server URL</label>
              <input type="url" placeholder="http://provider.com:8080" value={xtHost} onChange={e => setXtHost(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input type="text" placeholder="username" value={xtUser} onChange={e => setXtUser(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="password" value={xtPass} onChange={e => setXtPass(e.target.value)} required />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Connecting…' : 'Connect'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
