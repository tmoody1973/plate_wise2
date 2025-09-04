import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('url')
    if (!url) return new Response('missing url', { status: 400 })
    let target: URL
    try { target = new URL(url) } catch { return new Response('invalid url', { status: 400 }) }
    if (target.protocol !== 'http:' && target.protocol !== 'https:') return new Response('unsupported protocol', { status: 400 })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    
    // Try to fetch with more robust headers
    const fetchOptions: RequestInit = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
    }
    
    // Add referer only if not PBS (PBS might block with referer)
    if (!target.hostname.includes('pbs.org')) {
      (fetchOptions.headers as any)['Referer'] = `${target.origin}/`
    }
    
    let res: Response
    try {
      res = await fetch(target.toString(), fetchOptions).finally(() => clearTimeout(timeout))
    } catch (fetchError: any) {
      // Handle network errors (DNS failures, connection refused, etc.)
      if (process.env.NODE_ENV === 'development') {
        console.error(`Image proxy network error for ${url}:`, fetchError.message)
      }
      // Return placeholder for network errors
      const placeholder = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,10,73,68,65,84,120,156,99,96,0,0,0,2,0,1,226,33,188,159,0,0,0,0,73,69,78,68,174,66,96,130])
      return new Response(placeholder, { 
        status: 200, 
        headers: new Headers({ 
          'Content-Type': 'image/png', 
          'Cache-Control': 'public, max-age=3600', 
          'Access-Control-Allow-Origin': '*' 
        }) 
      })
    }

    if (!res.ok) {
      // Log the error for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.error(`Image proxy failed for ${url}: ${res.status} ${res.statusText}`)
      }
      // Fallback: return a tiny transparent PNG to avoid UI breakage
      const placeholder = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,10,73,68,65,84,120,156,99,96,0,0,0,2,0,1,226,33,188,159,0,0,0,0,73,69,78,68,174,66,96,130])
      return new Response(placeholder, { status: 200, headers: new Headers({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*' }) })
    }
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    if (!ct.startsWith('image/')) {
      const placeholder = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,10,73,68,65,84,120,156,99,96,0,0,0,2,0,1,226,33,188,159,0,0,0,0,73,69,78,68,174,66,96,130])
      return new Response(placeholder, { status: 200, headers: new Headers({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*' }) })
    }

    const lenHeader = res.headers.get('content-length')
    const MAX_BYTES = 15 * 1024 * 1024 // 15MB
    if (lenHeader && Number(lenHeader) > MAX_BYTES) {
      return new Response('too large', { status: 413 })
    }

    const upstream = res.body as ReadableStream<Uint8Array> | null
    if (!upstream) {
      const placeholder = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,10,73,68,65,84,120,156,99,96,0,0,0,2,0,1,226,33,188,159,0,0,0,0,73,69,78,68,174,66,96,130])
      return new Response(placeholder, { status: 200, headers: new Headers({ 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*' }) })
    }
    let total = 0
    const limited = new ReadableStream<Uint8Array>({
      start(controller) {
        const reader = upstream.getReader()
        function pump(): any {
          return reader.read().then(({ done, value }) => {
            if (done) { controller.close(); return }
            if (value) {
              total += value.byteLength
              if (total > MAX_BYTES) {
                try { reader.cancel() } catch {}
                controller.error(new Error('too_large'))
                return
              }
              controller.enqueue(value)
            }
            return pump()
          }).catch(err => controller.error(err))
        }
        return pump()
      }
    })

    const headers = new Headers({
      'Content-Type': ct,
      'Cache-Control': 'public, max-age=86400, immutable',
      'Access-Control-Allow-Origin': '*',
    })
    return new Response(limited, { status: 200, headers })
  } catch (e) {
    // Log the error for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('Image proxy error:', e)
    }
    // Return placeholder image instead of 500 error to avoid UI issues
    const placeholder = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,10,73,68,65,84,120,156,99,96,0,0,0,2,0,1,226,33,188,159,0,0,0,0,73,69,78,68,174,66,96,130])
    return new Response(placeholder, { 
      status: 200, 
      headers: new Headers({ 
        'Content-Type': 'image/png', 
        'Cache-Control': 'public, max-age=3600', 
        'Access-Control-Allow-Origin': '*' 
      }) 
    })
  }
}
