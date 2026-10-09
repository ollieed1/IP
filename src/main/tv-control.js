import { ipcMain } from 'electron'
import net from 'net'
import SamsungTV from 'samsung-tv-control'
import lgtv2 from 'lgtv2'

// Active connections
const connections = { samsung: null, lg: null }
let lgClient = null

// ── Discovery ──────────────────────────────────────────────────────────────

function probePort(host, port, timeoutMs = 1000) {
  return new Promise(resolve => {
    const socket = new net.Socket()
    socket.setTimeout(timeoutMs)
    socket.on('connect', () => { socket.destroy(); resolve(true) })
    socket.on('timeout', () => { socket.destroy(); resolve(false) })
    socket.on('error', () => { socket.destroy(); resolve(false) })
    socket.connect(port, host)
  })
}

async function scanNetwork(onFound) {
  // Get local subnet from network interfaces
  const { networkInterfaces } = await import('os')
  const ifaces = networkInterfaces()
  const subnets = []

  for (const iface of Object.values(ifaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        const parts = addr.address.split('.')
        subnets.push(`${parts[0]}.${parts[1]}.${parts[2]}`)
      }
    }
  }

  if (subnets.length === 0) return []

  const subnet = subnets[0]
  const found = []

  // Scan 1-254 in batches of 20
  for (let batch = 1; batch <= 254; batch += 20) {
    const promises = []
    for (let i = batch; i < Math.min(batch + 20, 255); i++) {
      const ip = `${subnet}.${i}`
      promises.push(
        Promise.all([
          probePort(ip, 8001).then(ok => ok ? { ip, type: 'samsung', port: 8001 } : null),
          probePort(ip, 3000).then(ok => ok ? { ip, type: 'lg', port: 3000 } : null),
        ])
      )
    }
    const results = (await Promise.all(promises)).flat().filter(Boolean)
    for (const r of results) {
      found.push(r)
      onFound?.(r)
    }
  }

  return found
}

// ── Samsung ────────────────────────────────────────────────────────────────

function connectSamsung(ip) {
  const config = {
    ip,
    mac: '00:00:00:00:00:00',
    name: 'IP Player',
    port: 8001,
  }
  const tv = new SamsungTV.default(config)
  connections.samsung = { tv, ip }
  return tv
}

function sendSamsungKey(key) {
  if (!connections.samsung) throw new Error('Not connected to Samsung TV')
  return new Promise((resolve, reject) => {
    connections.samsung.tv.sendKey(key, (err, res) => {
      if (err) reject(err)
      else resolve(res)
    })
  })
}

// ── LG ────────────────────────────────────────────────────────────────────

function connectLG(ip, clientKey = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      url: `ws://${ip}:3000`,
      ...(clientKey ? { clientKey } : {}),
    }
    const client = lgtv2(opts)
    lgClient = client
    connections.lg = { client, ip }

    client.on('connect', () => resolve({ connected: true }))
    client.on('error', reject)
    client.on('close', () => { lgClient = null; connections.lg = null })
  })
}

function sendLGKey(key) {
  return new Promise((resolve, reject) => {
    if (!lgClient) return reject(new Error('Not connected to LG TV'))
    lgClient.request('ssap://com.webos.service.ime/sendEnterKey', null, (err, res) => {
      if (err) reject(err)
      else resolve(res)
    })
  })
}

function sendLGCommand(uri, payload = null) {
  return new Promise((resolve, reject) => {
    if (!lgClient) return reject(new Error('Not connected to LG TV'))
    lgClient.request(uri, payload, (err, res) => {
      if (err) reject(err)
      else resolve(res)
    })
  })
}

// ── IPC Handlers ───────────────────────────────────────────────────────────

export function registerTvHandlers() {
  // Discover TVs on local network
  ipcMain.handle('tv:discover', async (event) => {
    const found = []
    await scanNetwork(device => {
      found.push(device)
      event.sender.send('tv:found', device)
    })
    return found
  })

  // Connect to a TV
  ipcMain.handle('tv:connect', async (_, { ip, type, clientKey }) => {
    try {
      if (type === 'samsung') {
        connectSamsung(ip)
        return { ok: true }
      } else if (type === 'lg') {
        const result = await connectLG(ip, clientKey)
        return { ok: true, ...result }
      }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  // Send a key/command
  ipcMain.handle('tv:key', async (_, { type, key }) => {
    try {
      if (type === 'samsung') {
        await sendSamsungKey(key)
        return { ok: true }
      } else if (type === 'lg') {
        // Map common keys to LG uris
        const lgKeyMap = {
          KEY_POWER:      'ssap://system/turnOff',
          KEY_VOLUP:      'ssap://audio/volumeUp',
          KEY_VOLDOWN:    'ssap://audio/volumeDown',
          KEY_MUTE:       'ssap://audio/setMute',
          KEY_HOME:       'ssap://system.launcher/open?target=com.webos.app.home',
          KEY_BACK:       'ssap://com.webos.service.ime/sendEnterKey',
          KEY_UP:         null,
          KEY_DOWN:       null,
          KEY_LEFT:       null,
          KEY_RIGHT:      null,
          KEY_ENTER:      'ssap://com.webos.service.ime/sendEnterKey',
        }
        if (key === 'KEY_VOLUP' || key === 'KEY_VOLDOWN' || key === 'KEY_MUTE') {
          await sendLGCommand(lgKeyMap[key])
          return { ok: true }
        } else if (lgKeyMap[key]) {
          await sendLGCommand(lgKeyMap[key])
          return { ok: true }
        }
        return { ok: false, error: 'Key not mapped for LG' }
      }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  // Get current volume (LG)
  ipcMain.handle('tv:volume', async (_, { type }) => {
    try {
      if (type === 'lg') {
        const res = await sendLGCommand('ssap://audio/getVolume')
        return { ok: true, volume: res.volume, muted: res.muted }
      }
      return { ok: false, error: 'Volume query not supported for this TV type' }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  })

  // Disconnect
  ipcMain.handle('tv:disconnect', async (_, { type }) => {
    if (type === 'samsung') {
      connections.samsung = null
    } else if (type === 'lg') {
      lgClient?.disconnect()
      lgClient = null
      connections.lg = null
    }
    return { ok: true }
  })

  // Connection status
  ipcMain.handle('tv:status', async () => {
    return {
      samsung: connections.samsung ? { ip: connections.samsung.ip } : null,
      lg: connections.lg ? { ip: connections.lg.ip } : null,
    }
  })
}
