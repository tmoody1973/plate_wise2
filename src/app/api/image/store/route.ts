import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSbClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const runtime = 'nodejs'

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return createSbClient(url, key)
}

async function loadBytes(url: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'PlateWise-ImageStore/1.0',
      'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'Referer': `${new URL(url).origin}/`,
      'Accept-Language': 'en-US,en;q=0.9',
    } as any,
    signal: controller.signal,
  })
  clearTimeout(timeout)
  if (!res.ok) throw new Error(`fetch_failed_${res.status}`)
  const ct = (res.headers.get('content-type') || '').toLowerCase()
  if (!ct.startsWith('image/')) throw new Error('not_image')
  const lenHeader = res.headers.get('content-length')
  const MAX_BYTES = 15 * 1024 * 1024
  if (lenHeader && Number(lenHeader) > MAX_BYTES) throw new Error('too_large')
  const ab = await res.arrayBuffer()
  if (ab.byteLength > MAX_BYTES) throw new Error('too_large')
  return { bytes: Buffer.from(ab), type: ct }
}

async function buildVariants(bytes: Buffer): Promise<{ thumb: Buffer; card: Buffer; hero: Buffer; lqip: string; palette: string[] }> {
  const sharp = (await import('sharp')).default
  const img = sharp(bytes).rotate()
  const [thumb, card, hero, tiny, stats] = await Promise.all([
    img.clone().resize({ width: 160, withoutEnlargement: true }).toFormat('webp', { quality: 80 }).toBuffer(),
    img.clone().resize({ width: 640, withoutEnlargement: true }).toFormat('webp', { quality: 82 }).toBuffer(),
    img.clone().resize({ width: 1280, withoutEnlargement: true }).toFormat('webp', { quality: 88 }).toBuffer(),
    img.clone().resize({ width: 24, withoutEnlargement: true }).toFormat('webp', { quality: 40 }).toBuffer(),
    img.clone().stats(),
  ])
  const dom = stats.dominant
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  const hex = `#${toHex(dom.r)}${toHex(dom.g)}${toHex(dom.b)}`
  const lqip = `data:image/webp;base64,${tiny.toString('base64')}`
  return { thumb, card, hero, lqip, palette: [hex] }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { url?: string; bucket?: string; key?: string }
    const url = body.url?.trim()
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })
    const bucket = body.bucket || 'recipe-images'
    // We will compute content hash from bytes for dedupe

    const sb = getSupabase()
    try { await sb.storage.createBucket(bucket, { public: true }) } catch {}

    const { bytes } = await loadBytes(url)
    const contentHash = crypto.createHash('sha256').update(bytes).digest('hex')
    const baseKey = body.key || `${contentHash}`

    // If already processed, return existing URLs
    try {
      const { data: listed } = await sb.storage.from(bucket).list(`${baseKey}`)
      if (Array.isArray(listed) && listed.some(f => f.name === 'card.webp')) {
        const urls = {
          thumb: sb.storage.from(bucket).getPublicUrl(`${baseKey}/thumb.webp`).data.publicUrl,
          card: sb.storage.from(bucket).getPublicUrl(`${baseKey}/card.webp`).data.publicUrl,
          hero: sb.storage.from(bucket).getPublicUrl(`${baseKey}/hero.webp`).data.publicUrl,
        }
        return NextResponse.json({ ok: true, public_urls: urls, image_hash: contentHash, reused: true })
      }
    } catch {}

    // Build and upload variants
    const variants = await buildVariants(bytes)
    const items = [
      { key: `${baseKey}/thumb.webp`, buf: variants.thumb },
      { key: `${baseKey}/card.webp`, buf: variants.card },
      { key: `${baseKey}/hero.webp`, buf: variants.hero },
    ]
    await sb.storage.from(bucket).remove(items.map(i => i.key)).catch(() => {})
    for (const it of items) {
      const { error } = await sb.storage.from(bucket).upload(it.key, it.buf, { contentType: 'image/webp', upsert: true })
      if (error) return NextResponse.json({ error: 'upload_failed', details: error.message }, { status: 500 })
    }
    const public_urls = {
      thumb: sb.storage.from(bucket).getPublicUrl(`${baseKey}/thumb.webp`).data.publicUrl,
      card: sb.storage.from(bucket).getPublicUrl(`${baseKey}/card.webp`).data.publicUrl,
      hero: sb.storage.from(bucket).getPublicUrl(`${baseKey}/hero.webp`).data.publicUrl,
    }
    return NextResponse.json({ ok: true, public_urls, image_hash: contentHash, palette: variants.palette, lqip: variants.lqip, reused: false })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
