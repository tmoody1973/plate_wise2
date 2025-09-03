import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory cache with TTL to avoid repeated fetch/parse for the same URL
type CacheEntry = { images: string[]; exp: number }
const CACHE = new Map<string, CacheEntry>()
const TTL_MS = 60 * 60 * 1000 // 1 hour

function absolutize(url: string, base: string): string | null {
  try { return new URL(url, base).toString() } catch { return null }
}

function extractFromJsonLd(html: string, baseUrl: string): string[] {
  const out: string[] = []
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const m of scripts) {
    const json = (m[1] || '').trim()
    try {
      const data = JSON.parse(json)
      const nodes: any[] = Array.isArray(data) ? data : (data?.['@graph'] && Array.isArray(data['@graph']) ? data['@graph'] : [data])
      for (const node of nodes) {
        const t = node?.['@type']
        const types = (Array.isArray(t) ? t : [t]).filter(Boolean).map((x: any) => String(x).toLowerCase())
        if (types.includes('recipe')) {
          const img = node?.image
          if (typeof img === 'string') {
            const abs = absolutize(img, baseUrl); if (abs) out.push(abs)
          } else if (Array.isArray(img)) {
            for (const it of img) {
              if (typeof it === 'string') { const abs = absolutize(it, baseUrl); if (abs) out.push(abs) }
              else if (it && typeof it === 'object' && typeof it.url === 'string') { const abs = absolutize(it.url, baseUrl); if (abs) out.push(abs) }
            }
          } else if (img && typeof img === 'object' && typeof img.url === 'string') {
            const abs = absolutize(img.url, baseUrl); if (abs) out.push(abs)
          }
        }
      }
    } catch {}
  }
  return out
}

function extractMetaContent(html: string, re: RegExp, baseUrl: string): string[] {
  const out: string[] = []
  const m1 = html.match(re)
  if (m1 && m1[1]) { const abs = absolutize(m1[1], baseUrl); if (abs) out.push(abs) }
  return out
}

function extractFromArticleImages(html: string, baseUrl: string): string[] {
  const out: string[] = []
  const body = html.slice(html.toLowerCase().indexOf('<body'))
  const imgRe = /<img[^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = imgRe.exec(body)) !== null) {
    const tag = m[0]
    const srcMatch = tag.match(/\s(?:src|data-src|data-lazy-src)=["']([^"']+)["']/i)
    const srcsetMatch = tag.match(/\ssrcset=["']([^"']+)["']/i)
    const candidates: string[] = []
    if (srcMatch && srcMatch[1]) candidates.push(srcMatch[1])
    if (srcsetMatch && srcsetMatch[1]) {
      const parts = srcsetMatch[1].split(',').map(s => s.trim().split(' ')[0]).filter(Boolean) as string[]
      candidates.push(...parts)
    }
    for (const c of candidates) {
      const abs = absolutize(c, baseUrl)
      if (abs) out.push(abs)
    }
    if (out.length > 10) break
  }
  return out
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const pageUrl = String(body?.url || '')
    if (!pageUrl) return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    let u: URL
    try { u = new URL(pageUrl) } catch { return NextResponse.json({ error: 'Invalid url' }, { status: 400 }) }
    if (!/^https?:$/.test(u.protocol)) return NextResponse.json({ error: 'Unsupported protocol' }, { status: 400 })

    // Cache hit
    const now = Date.now()
    const hit = CACHE.get(pageUrl)
    if (hit && hit.exp > now) {
      return NextResponse.json({ images: hit.images, cached: true })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(pageUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 Chrome/123 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
      },
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
    } as RequestInit).finally(() => clearTimeout(timeout))
    if (!res.ok) return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: 502 })
    const html = await res.text()

    const images = [
      ...extractFromJsonLd(html, pageUrl),
      // og:image (any attribute order)
      ...extractMetaContent(html, /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i, pageUrl),
      ...extractMetaContent(html, /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i, pageUrl),
      // og:image:secure_url and og:image:url
      ...extractMetaContent(html, /<meta[^>]+property=["']og:image:secure_url["'][^>]*content=["']([^"']+)["'][^>]*>/i, pageUrl),
      ...extractMetaContent(html, /<meta[^>]+property=["']og:image:url["'][^>]*content=["']([^"']+)["'][^>]*>/i, pageUrl),
      // twitter:image
      ...extractMetaContent(html, /<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i, pageUrl),
      ...extractMetaContent(html, /<meta[^>]+content=["']([^"']+)["'][^>]*name=["']twitter:image["'][^>]*>/i, pageUrl),
      // twitter:image:src
      ...extractMetaContent(html, /<meta[^>]+name=["']twitter:image:src["'][^>]*content=["']([^"']+)["'][^>]*>/i, pageUrl),
      // link rel=image_src
      ...extractMetaContent(html, /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/i, pageUrl),
      // fallback imgs
      ...extractFromArticleImages(html, pageUrl),
    ].filter(Boolean)

    let unique = Array.from(new Set(images)).filter(u => u.startsWith('http'))

    // If none found, try likely AMP/print variants
    if (unique.length === 0) {
      const altCandidates = [
        pageUrl.replace(/\/$/, '') + '/amp',
        pageUrl.replace(/\/$/, '') + '/print',
        pageUrl + (pageUrl.includes('?') ? '&' : '?') + 'outputType=amp',
        pageUrl + (pageUrl.includes('?') ? '&' : '?') + 'amp=1',
      ]
      for (const alt of altCandidates) {
        try {
          const ares = await fetch(alt, { headers: { 'user-agent': 'Mozilla/5.0', 'accept': 'text/html' }, cache: 'no-store', redirect: 'follow' } as RequestInit)
          if (!ares.ok) continue
          const ahtml = await ares.text()
          const imgs = [
            ...extractFromJsonLd(ahtml, alt),
            ...extractMetaContent(ahtml, /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i, alt),
            ...extractFromArticleImages(ahtml, alt),
          ]
          unique = Array.from(new Set([...unique, ...imgs])).filter(u => u.startsWith('http'))
          if (unique.length) break
        } catch {}
      }
    }

    // Store in cache
    CACHE.set(pageUrl, { images: unique, exp: Date.now() + TTL_MS })
    return NextResponse.json({ images: unique, cached: false })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
