import { ipcMain, net } from 'electron'
import { networkInterfaces } from 'os'

const conn = { samsung: null, lg: null }

function localSubnet() {
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs) {
      if (a.family === 'IPv4' && !a.internal) {
        const p = a.address.split('.')
        return `${p[0]}.${p[1]}.${p[2]}`
      }
    }
  }
  return null
}

function tcpOpen(host, port, ms = 800) {
  return new Promise(resolve => {
    const req = net.request({ url: `http://${host}:${port}/`, method: 'HEAD' })
    const timer = setTimeout(() => { try { req.abort() } catch {} ; resolve(false) }, ms)
    req.on('response', () => { clearTimeout(timer); resolve(true) })
    req.on('error', () => { clearTimeout(timer); resolve(false) })
    req.end()
  })
}

async function discoverTVs(onFound) {
  const subnet = localSubnet()
  if (!subnet) return []
  const found = []
  for (let start = 1; start < 255; start += 25) {
    const checks = []
    for (let i = start; i < Math.min(start + 25, 255); i++) {
      const ip = `${subnet}.${i}`
      checks.push(
        tcpOpen(ip, 8001).then(ok => ok ? { ip, type: 'samsung' } : null),
        tcpOpen(ip, 3000).then(ok => ok ? { ip, type: 'lg' } : null),
      )
    }
    const results = (await Promise.all(checks)).filter(Boolean)
    for (const r of results) { found.push(r); onFound?.(r) }
  }
  return found
}

export function registerTvHandlers() {
  ipcMain.handle('tv:discover', async (event) => {
    const found = []
    await discoverTVs(d => { found.push(d); event.sender.send('tv:found', d) })
    return found
  })

  ipcMain.handle('tv:connect', async (_, { ip, type, clientKey }) => {
    conn[type] = { ip, clientKey: clientKey || null }
    return { ok: true }
  })

  ipcMain.handle('tv:disconnect', async (_, { type }) => {
    conn[type] = null
    return { ok: true }
  })

  ipcMain.handle('tv:status', async () => ({
    samsung: conn.samsung ? { ip: conn.samsung.ip } : null,
    lg: conn.lg ? { ip: conn.lg.ip } : null,
  }))

  ipcMain.handle('tv:getConn', async (_, { type }) => conn[type] || null)

  ipcMain.handle('tv:saveClientKey', async (_, { type, clientKey }) => {
    if (conn[type]) conn[type].clientKey = clientKey
    return { ok: true }
  })
}
