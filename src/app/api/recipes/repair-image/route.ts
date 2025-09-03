import { NextRequest, NextResponse } from 'next/server'
import { enrichMissingImages } from '@/lib/recipes/search'
import OpenAI from 'openai'
import { createClient as createSbClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const key = serviceKey || anonKey
  if (!url || !key) throw new Error('Supabase not configured')
  return createSbClient(url, key)
}

async function fetchOgImage(source: string): Promise<string | null> {
  try {
    const res = await fetch(source, { headers: { 'User-Agent': 'PlateWise-ImageRepair/1.0' } as any })
    if (!res.ok) return null
    const html = await res.text()
    const metas: string[] = []
    const push = (re: RegExp) => { const m = html.match(re); if (m && m[1]) metas.push(m[1]) }
    push(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i)
    push(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i)
    push(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/i)
    for (const raw of metas) {
      try {
        const abs = new URL(raw, source).toString()
        if (/\.(jpg|jpeg|png|webp|gif)(\?|#|$)/i.test(new URL(abs).pathname)) return abs
      } catch {}
    }
    return null
  } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { id?: string; source?: string; title?: string }
    const source = body.source?.trim()
    const id = body.id?.trim()
    const title = body.title || 'recipe'
    if (!source && !id) return NextResponse.json({ error: 'id or source required' }, { status: 400 })

    const supabase = getSupabase()

    // Resolve by id -> source if needed
    let targetId: string | null = id || null
    let sourceUrl = source || ''
    if (!sourceUrl) {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, metadata')
        .eq('id', targetId)
        .single()
      if (error || !data) return NextResponse.json({ error: 'recipe_not_found' }, { status: 404 })
      sourceUrl = String((data as any).metadata?.source_url || '')
      if (!sourceUrl) return NextResponse.json({ error: 'source_url_missing' }, { status: 400 })
      targetId = data.id
    } else if (!targetId) {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, metadata')
        .filter('metadata->>source_url', 'eq', sourceUrl)
        .limit(1)
        .single()
      if (!error && data) targetId = data.id
    }

    // Try server extractor first for best candidates
    let imageUrl: string | null = null
    try {
      const extractRes = await fetch(new URL('/api/extract-recipe', req.nextUrl).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sourceUrl }),
      })
      const ej = await extractRes.json().catch(() => ({}))
      if (extractRes.ok && Array.isArray(ej?.images) && ej.images.length) {
        const best = await pickBestImageUrl(title, ej.images, new URL(sourceUrl).hostname.replace(/^www\./, ''))
        if (best) imageUrl = best
      }
    } catch {}

    // Fallback: page OG image
    if (!imageUrl) {
      imageUrl = await fetchOgImage(sourceUrl)
    }

    // Fall back to OpenAI image enrichment
    if (!imageUrl) {
      const images = await enrichMissingImages([{ title, source: sourceUrl, image: undefined, ingredients: [{ item: 'x', quantity: 1 } as any], instructions: [{ step: 1, text: 'x' }], cuisine: 'international' } as any])
      imageUrl = images[sourceUrl] || null
    }

    // Tavily as last resort
    if (!imageUrl) {
      const tavilyKey = process.env.TAVILY_API_KEY
      if (tavilyKey) {
        try {
          const domain = new URL(sourceUrl).hostname.replace(/^www\./, '')
          const q = `${title} site:${domain} image`
          const tr = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: tavilyKey, query: q, search_depth: 'basic', include_images: true, max_results: 3 }),
          } as RequestInit)
          if (tr.ok) {
            const j: any = await tr.json().catch(() => null)
            const imgs: string[] = []
            if (j?.images) imgs.push(...j.images)
            if (Array.isArray(j?.results)) for (const it of j.results) if (Array.isArray(it?.images)) imgs.push(...it.images)
            // If multiple candidates, score with OpenAI to select best
            const chosen = await pickBestImageUrl(title, imgs, domain)
            if (chosen) imageUrl = chosen
          }
        } catch {}
      }
    }

    if (!imageUrl) return NextResponse.json({ error: 'image_not_found' }, { status: 404 })

    // Upload to Supabase Storage for stability
    let publicUrl: string | null = null
    let variants: any
    let palette: any
    let lqip: any
    try {
      const storeRes = await fetch(new URL('/api/image/store', req.nextUrl).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: imageUrl }),
      })
      const js = await storeRes.json().catch(() => ({}))
      if (storeRes.ok && (js?.public_urls?.card || js?.public_url)) publicUrl = (js.public_urls?.card || js.public_url)
      // Merge variants/metadata if provided
      variants = js?.public_urls
      palette = js?.palette
      lqip = js?.lqip
    } catch {}
    const finalUrl = publicUrl || imageUrl

    if (targetId) {
      // Merge metadata.image_url
      const { data: row, error: selErr } = await supabase
        .from('recipes')
        .select('id, metadata')
        .eq('id', targetId)
        .single()
      if (selErr || !row) return NextResponse.json({ error: 'recipe_not_found' }, { status: 404 })
      const meta = { ...(row as any).metadata, image_url: finalUrl, image_set: variants || (row as any).metadata?.image_set, palette: palette || (row as any).metadata?.palette, lqip: lqip || (row as any).metadata?.lqip }
      const { error: upErr } = await supabase
        .from('recipes')
        .update({ metadata: meta })
        .eq('id', targetId)
      if (upErr) return NextResponse.json({ error: 'update_failed', details: upErr.message }, { status: 500 })
    } else {
      // Update by source_url
      const { data: row, error: selErr } = await supabase
        .from('recipes')
        .select('id, metadata')
        .filter('metadata->>source_url', 'eq', sourceUrl)
        .limit(1)
        .single()
      if (!selErr && row) {
        const meta = { ...(row as any).metadata, image_url: finalUrl, image_set: variants || (row as any).metadata?.image_set, palette: palette || (row as any).metadata?.palette, lqip: lqip || (row as any).metadata?.lqip }
        const { error: upErr } = await supabase
          .from('recipes')
          .update({ metadata: meta })
          .eq('id', row.id)
        if (upErr) return NextResponse.json({ error: 'update_failed', details: upErr.message }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true, image_url: finalUrl, image_set: variants, palette, lqip })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

async function pickBestImageUrl(title: string, candidates: string[], domain: string): Promise<string | null> {
  const list = Array.from(new Set(candidates.filter(Boolean)))
  if (!list.length) return null
  // Heuristic quick pick
  const exts = /(\.jpg|\.jpeg|\.png|\.webp|\.gif)(\?|#|$)/i
  const sameDomain = list.filter(u => { try { return new URL(u).hostname.includes(domain) } catch { return false } })
  const extFiltered = (sameDomain.length ? sameDomain : list).filter(u => exts.test(u))
  const pick = extFiltered[0] || list[0] || null
  try {
    // Ask OpenAI to choose the best match to the title among provided candidates
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return pick
    const client = new OpenAI({ apiKey })
    const schema = {
      name: 'best_image',
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { url: { type: 'string' } },
        required: ['url'],
      },
      strict: true,
    } as const
    const instructions = 'From the candidate image URLs, select the single link that most likely shows the dish titled below. Prefer same-domain sources and direct image files.'
    const input = JSON.stringify({ title, domain, candidates: list })
    const resp = await client.responses.create({
      model: process.env.OPENAI_RESPONSES_MODEL || 'gpt-5-nano',
      text: { format: schema as any, verbosity: 'low' as any } as any,
      instructions,
      input,
      parallel_tool_calls: false,
      max_output_tokens: 300,
      reasoning: { effort: 'low' } as any,
    } as any)
    const out = (resp as any).output_text
    if (!out) return pick
    const data = JSON.parse(out)
    if (data?.url && typeof data.url === 'string') return data.url
    return pick
  } catch {
    return pick
  }
}
