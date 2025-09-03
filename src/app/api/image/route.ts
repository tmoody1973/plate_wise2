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
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(target.toString(), {
      headers: {
        'User-Agent': 'PlateWise-ImageProxy/1.0',
        'Referer': `${target.origin}/`,
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
    } as RequestInit).finally(() => clearTimeout(timeout))

    if (!res.ok) return new Response('fetch failed', { status: 502 })
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    if (!ct.startsWith('image/')) return new Response('not an image', { status: 415 })

    const lenHeader = res.headers.get('content-length')
    const MAX_BYTES = 15 * 1024 * 1024 // 15MB
    if (lenHeader && Number(lenHeader) > MAX_BYTES) {
      return new Response('too large', { status: 413 })
    }

    const upstream = res.body as ReadableStream<Uint8Array> | null
    if (!upstream) return new Response('no body', { status: 502 })
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
    return new Response('proxy_error', { status: 500 })
  }
}
