import React, { useState, useEffect, useCallback, useRef } from 'react'

const isElectron = typeof window !== 'undefined' && !!window.api?.tvDiscover

// ── Samsung WebSocket protocol ─────────────────────────────────────────────
function samsungWS(ip, token = null, ssl = true) {
  const appName = btoa('IP Player')
  const proto = ssl ? 'wss' : 'ws'
  const port  = ssl ? 8002 : 8001
  const base = `${proto}://${ip}:${port}/api/v2/channels/samsung.remote.control?name=${appName}`
  return token ? `${base}&token=${token}` : base
}

function samsungKeyMsg(key) {
  return JSON.stringify({ method: 'ms.remote.control', params: { Cmd: 'Click', DataOfCmd: key, Option: 'false', TypeOfRemote: 'SendRemoteKey' } })
}

// ── LG SSAP WebSocket protocol ─────────────────────────────────────────────
const LG_KEY_MAP = {
  KEY_UP:    'UP',    KEY_DOWN:  'DOWN',
  KEY_LEFT:  'LEFT',  KEY_RIGHT: 'RIGHT',
  KEY_ENTER: 'ENTER', KEY_BACK:  'BACK',
  KEY_HOME:  'HOME',  KEY_MENU:  'MENU',
  KEY_POWER: 'POWER',
}

// ── Component ──────────────────────────────────────────────────────────────
export default function RemoteControl() {
  const [phase, setPhase] = useState('idle') // idle|scanning|connecting|connected|error
  const [devices, setDevices] = useState([])
  const [connected, setConnected] = useState(null) // { ip, type }
  const [error, setError] = useState(null)
  const [manualIp, setManualIp] = useState('')
  const [manualType, setManualType] = useState('samsung')
  const wsRef = useRef(null)
  const lgIdRef = useRef(1)
  const lgPendingRef = useRef({})

  // Restore connection status on mount
  useEffect(() => {
    if (!isElectron) return
    window.api.tvStatus().then(s => {
      if (s.samsung) reconnectWS(s.samsung.ip, 'samsung')
      else if (s.lg) reconnectWS(s.lg.ip, 'lg')
    })
    return () => wsRef.current?.close()
  }, [])

  // ── Samsung WS ────────────────────────────────────────────────────────
  function openSamsungWS(ip, token = null) {
    return new Promise((resolve, reject) => {
      const url = samsungWS(ip, token, true)
      console.log('[TV] connecting to', url)
      const ws = new WebSocket(url)
      let resolved = false
      const timeout = setTimeout(() => {
        if (!resolved) { resolved = true; reject(new Error('Connection timed out after 10s')) }
      }, 10000)
      ws.onopen = () => console.log('[TV] WS open — waiting for TV handshake')
      ws.onerror = (e) => {
        console.log('[TV] WS error', e)
        clearTimeout(timeout)
        if (!resolved) { resolved = true; reject(new Error('WebSocket error — TV refused connection')) }
      }
      ws.onclose = (e) => {
        console.log('[TV] WS closed', e.code, e.reason)
        clearTimeout(timeout)
        if (wsRef.current === ws) { wsRef.current = null; setConnected(null); setPhase('idle') }
        if (!resolved) { resolved = true; reject(new Error(`TV closed connection (code ${e.code})`)) }
      }
      ws.onmessage = (e) => {
        console.log('[TV] message', e.data)
        try {
          const msg = JSON.parse(e.data)
          if (msg.event === 'ms.channel.connect') {
            const tok = msg.data?.token
            if (tok) { console.log('[TV] got token', tok); window.api.tvSaveClientKey('samsung', tok) }
            clearTimeout(timeout)
            wsRef.current = ws
            ws.onclose = () => { if (wsRef.current === ws) { wsRef.current = null; setConnected(null); setPhase('idle') } }
            if (!resolved) { resolved = true; resolve(ws) }
          } else if (msg.event === 'ms.channel.unauthorized') {
            clearTimeout(timeout)
            if (!resolved) { resolved = true; reject(new Error('TV denied access — check IP Remote is enabled')) }
          }
        } catch {}
      }
    })
  }

  // ── LG WS ────────────────────────────────────────────────────────────
  function openLgWS(ip, clientKey = null) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://${ip}:3000`)
      ws.onopen = () => {
        // Send pairing handshake
        const payload = { type: 'register', id: 'reg0', payload: { forcePairing: false, pairingType: 'PROMPT', 'client-key': clientKey || undefined } }
        ws.send(JSON.stringify(payload))
      }
      ws.onerror = () => reject(new Error('Could not connect to LG TV'))
      ws.onclose = () => { if (wsRef.current === ws) { wsRef.current = null; setConnected(null); setPhase('idle') } }
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'registered') {
            const key = msg.payload?.['client-key']
            if (key) window.api.tvSaveClientKey('lg', key)
            wsRef.current = ws
            resolve(ws)
          } else if (msg.id && lgPendingRef.current[msg.id]) {
            lgPendingRef.current[msg.id](msg)
            delete lgPendingRef.current[msg.id]
          }
        } catch {}
      }
      setTimeout(() => reject(new Error('LG pairing timed out')), 30000)
    })
  }

  function lgRequest(uri, payload = {}) {
    return new Promise((resolve) => {
      if (!wsRef.current) return resolve(null)
      const id = `cmd_${lgIdRef.current++}`
      lgPendingRef.current[id] = resolve
      wsRef.current.send(JSON.stringify({ type: 'request', id, uri, payload }))
    })
  }

  async function reconnectWS(ip, type) {
    try {
      const saved = await window.api.tvGetConn(type)
      if (type === 'samsung') await openSamsungWS(ip, saved?.clientKey || null)
      else await openLgWS(ip, saved?.clientKey || null)
      setConnected({ ip, type })
      setPhase('connected')
    } catch {}
  }

  // ── Actions ───────────────────────────────────────────────────────────
  const scan = useCallback(async () => {
    setPhase('scanning')
    setDevices([])
    setError(null)
    const found = []
    await window.api.tvDiscover(d => { found.push(d); setDevices(prev => [...prev, d]) })
    setPhase(found.length ? 'idle' : 'idle')
  }, [])

  const connect = useCallback(async (ip, type) => {
    setPhase('connecting')
    setError(null)
    try {
      const saved = await window.api.tvGetConn(type)
      if (type === 'samsung') await openSamsungWS(ip, saved?.clientKey || null)
      else await openLgWS(ip, saved?.clientKey || null)
      await window.api.tvConnect({ ip, type })
      setConnected({ ip, type })
      setPhase('connected')
    } catch (e) {
      setError(e.message)
      setPhase('idle')
    }
  }, [])

  const disconnect = useCallback(async () => {
    wsRef.current?.close()
    wsRef.current = null
    if (connected) await window.api.tvDisconnect(connected.type)
    setConnected(null)
    setPhase('idle')
  }, [connected])

  const sendKey = useCallback(async (key) => {
    if (!wsRef.current || !connected) return
    if (connected.type === 'samsung') {
      wsRef.current.send(samsungKeyMsg(key))
    } else {
      // LG: volume/mute via SSAP, d-pad via input socket
      if (key === 'KEY_VOLUP')   await lgRequest('ssap://audio/volumeUp')
      else if (key === 'KEY_VOLDOWN') await lgRequest('ssap://audio/volumeDown')
      else if (key === 'KEY_MUTE')    await lgRequest('ssap://audio/setMute', { mute: true })
      else if (key === 'KEY_HOME')    await lgRequest('ssap://system.launcher/open', { target: 'com.webos.app.home' })
      else if (key === 'KEY_POWER')   await lgRequest('ssap://system/turnOff')
      else if (LG_KEY_MAP[key]) {
        // D-pad & back via input control
        const sock = await lgRequest('ssap://com.webos.service.networkinput/getPointerInputSocket')
        if (sock?.payload?.socketPath) {
          const inputWs = new WebSocket(sock.payload.socketPath.replace('wss://', 'ws://'))
          inputWs.onopen = () => {
            inputWs.send(JSON.stringify({ type: 'button', name: LG_KEY_MAP[key] }))
            setTimeout(() => inputWs.close(), 300)
          }
        }
      }
    }
  }, [connected])

  // ── Render ────────────────────────────────────────────────────────────
  if (!isElectron) {
    return (
      <div className="remote-unavailable">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="3"/><circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/><path d="M9 7h6M9 10h4"/></svg>
        <p>TV Remote is only available in the desktop app.</p>
      </div>
    )
  }

  if (phase === 'connected' && connected) {
    return (
      <div className="remote-wrap">
        <div className="remote-connected-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          <span>{connected.type === 'samsung' ? 'Samsung' : 'LG'} TV · {connected.ip}</span>
          <button className="remote-disconnect" onClick={disconnect}>Disconnect</button>
        </div>

        <div className="remote-body">
          <div className="remote-row remote-row-center">
            <button className="remote-btn remote-btn-power" onClick={() => sendKey('KEY_POWER')} title="Power">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v6M6.3 6.3A8 8 0 1 0 17.7 6.3"/></svg>
            </button>
          </div>

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
        <p className="remote-sub">Control a Samsung or LG TV on the same WiFi network.</p>
      </div>

      <button className="remote-scan-btn" onClick={scan} disabled={phase === 'scanning'}>
        {phase === 'scanning' ? (
          <><svg className="remote-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-18 0"/></svg>Scanning network...</>
        ) : (
          <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>Scan for TVs</>
        )}
      </button>

      {devices.length > 0 && (
        <div className="remote-device-list">
          {devices.map(d => (
            <button key={d.ip} className="remote-device-row" onClick={() => connect(d.ip, d.type)} disabled={phase === 'connecting'}>
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

      {phase === 'connecting' && (
        <p className="remote-sub" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg className="remote-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}><path d="M21 12a9 9 0 1 1-18 0"/></svg>
          Connecting — accept the prompt on your TV…
        </p>
      )}

      {error && <p className="remote-error">{error}</p>}

      <details className="remote-manual">
        <summary>Enter IP manually</summary>
        <div className="remote-manual-fields">
          <input className="remote-input" placeholder="192.168.1.x" value={manualIp} onChange={e => setManualIp(e.target.value)} />
          <select className="remote-select" value={manualType} onChange={e => setManualType(e.target.value)}>
            <option value="samsung">Samsung</option>
            <option value="lg">LG</option>
          </select>
          <button className="remote-scan-btn" onClick={() => connect(manualIp, manualType)} disabled={!manualIp || phase === 'connecting'}>Connect</button>
        </div>
      </details>
    </div>
  )
}
