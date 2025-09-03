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

function buildSVG(title: string, badge?: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const t = esc(title).slice(0, 80)
  const b = badge ? esc(badge).slice(0, 24) : ''
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0ea5e9"/>
      <stop offset="100%" stop-color="#22c55e"/>
    </linearGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#00000066"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <g filter="url(#shadow)">
    <rect x="60" y="60" rx="24" ry="24" width="1160" height="600" fill="#ffffffEE"/>
  </g>
  <text x="100" y="360" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="72" font-weight="700" fill="#0f172a">${t}</text>
  ${b ? `<rect x="100" y="420" rx="16" ry="16" width="auto" height="64" fill="#0ea5e9"/>
  <text x="120" y="465" font-family="ui-sans-serif, system-ui" font-size="36" font-weight="700" fill="#ffffff">${b}</text>` : ''}
  <text x="100" y="640" font-family="ui-sans-serif, system-ui" font-size="28" fill="#334155">PlateWise</text>
  </svg>`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { title?: string; badge?: string; bucket?: string }
    const title = (body.title || 'Delicious Recipe').toString()
    const badge = (body.badge || '').toString()
    const bucket = body.bucket || 'recipe-images'

    const sharp = (await import('sharp')).default
    const svg = Buffer.from(buildSVG(title, badge))
    const hero = await sharp(svg).resize(1280, 720).toFormat('webp', { quality: 90 }).toBuffer()
    const hash = crypto.createHash('sha256').update(hero).digest('hex')
    const key = `${hash}/hero.webp`

    const sb = getSupabase()
    try { await sb.storage.createBucket(bucket, { public: true }) } catch {}
    await sb.storage.from(bucket).remove([key]).catch(() => {})
    const { error: upErr } = await sb.storage.from(bucket).upload(key, hero, { contentType: 'image/webp', upsert: true })
    if (upErr) return NextResponse.json({ error: 'upload_failed', details: upErr.message }, { status: 500 })
    const { data } = sb.storage.from(bucket).getPublicUrl(key)
    return NextResponse.json({ ok: true, public_url: data.publicUrl, image_hash: hash })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

