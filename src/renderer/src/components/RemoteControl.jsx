import React, { useState, useEffect, useCallback } from 'react'

const isElectron = typeof window !== 'undefined' && !!window.api?.tvDiscover

export default function RemoteControl() {
  const [phase, setPhase] = useState('idle') // idle | scanning | found | connecting | connected | error
  const [devices, setDevices] = useState([])
  const [connected, setConnected] = useState(null) // { ip, type }
  const [error, setError] = useState(null)
  const [manualIp, setManualIp] = useState('')
  const [manualType, setManualType] = useState('samsung')

  // Scan on mount
  useEffect(() => {
    if (!isElectron) return
    window.api.tvStatus().then(status => {
      if (status.samsung) setConnected({ ip: status.samsung.ip, type: 'samsung' })
      else if (status.lg) setConnected({ ip: status.lg.ip, type: 'lg' })
    })
  }, [])

  const scan = useCallback(async () => {
    setPhase('scanning')
    setDevices([])
    setError(null)
    const found = []
    await window.api.tvDiscover(device => {
      found.push(device)
      setDevices(d => [...d, device])
    })
    setPhase(found.length > 0 ? 'found' : 'idle')
  }, [])

  const connect = useCallback(async (ip, type) => {
    setPhase('connecting')
    setError(null)
    const res = await window.api.tvConnect({ ip, type })
    if (res.ok) {
      setConnected({ ip, type })
      setPhase('connected')
    } else {
      setError(res.error || 'Connection failed')
      setPhase('found')
    }
  }, [])

  const disconnect = useCallback(async () => {
    if (!connected) return
    await window.api.tvDisconnect(connected.type)
    setConnected(null)
    setPhase('idle')
  }, [connected])

  const sendKey = useCallback(async (key) => {
    if (!connected) return
    await window.api.tvKey(connected.type, key)
  }, [connected])

  if (!isElectron) {
    return (
      <div className="remote-unavailable">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="3"/><circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/><path d="M9 7h6M9 10h4"/></svg>
        <p>TV Remote is only available in the desktop app.</p>
      </div>
    )
  }

  if (connected) {
    return (
      <div className="remote-wrap">
        <div className="remote-connected-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          <span>{connected.type === 'samsung' ? 'Samsung' : 'LG'} TV · {connected.ip}</span>
          <button className="remote-disconnect" onClick={disconnect}>Disconnect</button>
        </div>

        <div className="remote-body">
          {/* Power */}
          <div className="remote-row remote-row-center">
            <button className="remote-btn remote-btn-power" onClick={() => sendKey('KEY_POWER')} title="Power">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v6M6.3 6.3A8 8 0 1 0 17.7 6.3"/></svg>
            </button>
          </div>

          {/* D-pad */}
          <div className="remote-dpad">
            <button className="remote-btn remote-btn-dpad remote-dpad-up" onClick={() => sendKey('KEY_UP')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg>
            </button>
            <button className="remote-btn remote-btn-dpad remote-dpad-left" onClick={() => sendKey('KEY_LEFT')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button className="remote-btn remote-btn-ok" onClick={() => sendKey('KEY_ENTER')}>OK</button>
            <button className="remote-btn remote-btn-dpad remote-dpad-right" onClick={() => sendKey('KEY_RIGHT')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            <button className="remote-btn remote-btn-dpad remote-dpad-down" onClick={() => sendKey('KEY_DOWN')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
          </div>

          {/* Vol + Back + Home */}
          <div className="remote-row">
            <button className="remote-btn remote-btn-sm" onClick={() => sendKey('KEY_VOLDOWN')} title="Vol -">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6M17 9l6 6"/></svg>
            </button>
            <button className="remote-btn remote-btn-sm" onClick={() => sendKey('KEY_MUTE')} title="Mute">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            </button>
            <button className="remote-btn remote-btn-sm" onClick={() => sendKey('KEY_VOLUP')} title="Vol +">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            </button>
          </div>

          <div className="remote-row">
            <button className="remote-btn remote-btn-sm" onClick={() => sendKey('KEY_BACK')} title="Back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            </button>
            <button className="remote-btn remote-btn-sm" onClick={() => sendKey('KEY_HOME')} title="Home">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
            </button>
            <button className="remote-btn remote-btn-sm" onClick={() => sendKey('KEY_MENU')} title="Menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="remote-wrap">
      <div className="remote-discover-header">
        <h2 className="remote-title">TV Remote</h2>
        <p className="remote-sub">Control a Samsung or LG TV on the same network.</p>
      </div>

      <button
        className="remote-scan-btn"
        onClick={scan}
        disabled={phase === 'scanning'}
      >
        {phase === 'scanning' ? (
          <>
            <svg className="remote-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-18 0"/></svg>
            Scanning network...
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            Scan for TVs
          </>
        )}
      </button>

      {devices.length > 0 && (
        <div className="remote-device-list">
          {devices.map(d => (
            <button
              key={d.ip}
              className="remote-device-row"
              onClick={() => connect(d.ip, d.type)}
              disabled={phase === 'connecting'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              <div>
                <span className="remote-device-name">{d.type === 'samsung' ? 'Samsung TV' : 'LG TV'}</span>
                <span className="remote-device-ip">{d.ip}</span>
              </div>
              <svg className="remote-device-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          ))}
        </div>
      )}

      {error && <p className="remote-error">{error}</p>}

      {/* Manual connect */}
      <details className="remote-manual">
        <summary>Enter IP manually</summary>
        <div className="remote-manual-fields">
          <input
            className="remote-input"
            placeholder="192.168.1.x"
            value={manualIp}
            onChange={e => setManualIp(e.target.value)}
          />
          <select className="remote-select" value={manualType} onChange={e => setManualType(e.target.value)}>
            <option value="samsung">Samsung</option>
            <option value="lg">LG</option>
          </select>
          <button
            className="remote-scan-btn"
            onClick={() => connect(manualIp, manualType)}
            disabled={!manualIp || phase === 'connecting'}
          >
            Connect
          </button>
        </div>
      </details>
    </div>
  )
}
