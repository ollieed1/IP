import { createServer } from 'http'
import { spawn, execSync } from 'child_process'

let server = null
let port = null
let activeProcesses = new Map()

// Find a free port
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.listen(0, '127.0.0.1', () => {
      const p = srv.address().port
      srv.close(() => resolve(p))
    })
    srv.on('error', reject)
  })
}

// Detect ffmpeg path — Homebrew on Apple Silicon or Intel
function findFfmpeg() {
  const candidates = [
    '/opt/homebrew/bin/ffmpeg',   // Apple Silicon Homebrew
    '/usr/local/bin/ffmpeg',      // Intel Homebrew
    '/usr/bin/ffmpeg',
  ]
  for (const p of candidates) {
    try { execSync(`test -x "${p}"`, { stdio: 'ignore' }); return p } catch {}
  }
  try { return execSync('which ffmpeg', { encoding: 'utf8' }).trim() } catch {}
  return null
}

export async function startStreamProxy() {
  if (server) return port

  const ffmpegPath = findFfmpeg()
  if (!ffmpegPath) {
    console.warn('ffmpeg not found — audio transcoding unavailable')
    return null
  }

  port = await getFreePort()

  server = createServer((req, res) => {
    // Parse: GET /?url=<encoded>
    const raw = req.url.split('?url=')[1]
    if (!raw) { res.writeHead(400); res.end('missing url'); return }
    const sourceUrl = decodeURIComponent(raw)

    const reqId = Date.now() + Math.random()

    res.setHeader('Content-Type', 'video/mp4')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Access-Control-Allow-Origin', '*')

    const ff = spawn(ffmpegPath, [
      '-loglevel', 'error',
      '-i', sourceUrl,
      '-map', '0:v:0',       // first video stream
      '-map', '0:a:0',       // first audio stream
      '-c:v', 'copy',        // copy video — no re-encode (fast)
      '-c:a', 'aac',         // transcode audio to AAC (works in Chromium)
      '-b:a', '192k',
      '-ac', '2',            // stereo
      '-f', 'mp4',
      '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
      'pipe:1'
    ], { stdio: ['ignore', 'pipe', 'ignore'] })

    activeProcesses.set(reqId, ff)

    ff.stdout.pipe(res)

    ff.on('error', (err) => {
      console.error('ffmpeg spawn error:', err.message)
      activeProcesses.delete(reqId)
      if (!res.headersSent) { res.writeHead(500); res.end() }
    })

    ff.on('close', () => {
      activeProcesses.delete(reqId)
    })

    req.on('close', () => {
      activeProcesses.delete(reqId)
      ff.kill('SIGKILL')
    })
  })

  server.listen(port, '127.0.0.1')
  console.log(`Stream proxy running on port ${port} using ${ffmpegPath}`)
  return port
}

export function getProxyUrl(sourceUrl) {
  if (!port) return null
  return `http://127.0.0.1:${port}/?url=${encodeURIComponent(sourceUrl)}`
}

export function stopAllStreams() {
  for (const ff of activeProcesses.values()) {
    try { ff.kill('SIGKILL') } catch {}
  }
  activeProcesses.clear()
}

export function ffmpegAvailable() {
  return !!findFfmpeg()
}
