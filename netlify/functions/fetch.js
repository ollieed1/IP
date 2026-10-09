// CORS proxy — fetches a URL server-side so the browser can reach IPTV sources
// that don't send Access-Control-Allow-Origin headers.
//
// Deploy this file to the GROOGLE repo at netlify/functions/fetch.js
// Then add to groogle's netlify.toml:
//
//   [[redirects]]
//     from = "/api/fetch"
//     to   = "/.netlify/functions/fetch"
//     status = 200

exports.handler = async (event) => {
  const url = event.queryStringParameters?.url
  if (!url) {
    return { statusCode: 400, body: 'missing url parameter' }
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; IPTV/1.0)',
        'Accept': '*/*',
      },
      signal: AbortSignal.timeout(12000),
    })

    const body = await res.text()
    const contentType = res.headers.get('content-type') || 'text/plain; charset=utf-8'

    return {
      statusCode: res.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
      body,
    }
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: e.message,
    }
  }
}
