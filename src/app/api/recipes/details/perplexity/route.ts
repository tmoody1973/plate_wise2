import { NextRequest, NextResponse } from 'next/server'
import { parseRecipeFromHtml } from '@/lib/recipes/html-recipe-parser'

export const runtime = 'edge'
export const preferredRegion = ['cle1']
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type DetailsResponse = {
  success: boolean
  recipe?: any
  error?: string
  used?: { method: 'jsonld' | 'heuristic' | 'perplexity'; imageFallback: boolean }
}

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    return res
  } finally {
    clearTimeout(id)
  }
}

function resolveUrl(base: string, maybe: string | undefined | null): string | undefined {
  if (!maybe) return undefined
  try {
    return new URL(maybe, base).toString()
  } catch {
    return undefined
  }
}

function extractMetaContent(html: string, selector: RegExp): string | undefined {
  const m = html.match(selector)
  if (!m) return undefined
  const tag = m[0]
  const c = tag.match(/content=["']([^"']+)["']/i)
  return c ? c[1] : undefined
}

function extractImageFromHtml(url: string, html: string): string | undefined {
  // Try common meta tags first
  const og = extractMetaContent(html, /<meta[^>]+property=["']og:image(:secure_url)?["'][^>]*>/i)
  const tw = extractMetaContent(html, /<meta[^>]+name=["']twitter:image(:src)?["'][^>]*>/i)
  const link = html.match(/<link[^>]+rel=["']image_src["'][^>]*>/i)
  let linkHref: string | undefined
  if (link) {
    const m = String(link[0]).match(/href=["']([^"']+)["']/i)
    linkHref = m ? m[1] : undefined
  }
  const candidate = og || tw || linkHref
  if (candidate) return resolveUrl(url, candidate)
  // Try JSON-LD ImageObject
  const ldImg = html.match(/\"image\"\s*:\s*(\{[^}]*\}|\[[^\]]*\]|\"[^\"]+\")/i)
  if (ldImg) {
    try {
      const chunk = ldImg[1]
      if (chunk.startsWith('"')) {
        const v = chunk.replace(/^\"|\"$/g, '')
        return resolveUrl(url, v)
      }
      const parsed = JSON.parse(chunk)
      if (Array.isArray(parsed)) {
        const first = parsed[0]
        if (typeof first === 'string') return resolveUrl(url, first)
        if (first && first.url) return resolveUrl(url, first.url)
      } else if (parsed) {
        if (typeof parsed === 'string') return resolveUrl(url, parsed)
        if (parsed.url) return resolveUrl(url, parsed.url)
      }
    } catch {}
  }
  // Last resort: first large <img>
  const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)].map(m => m[1])
  if (imgs.length) return resolveUrl(url, imgs[0])
  return undefined
}

async function extractViaPerplexity(url: string, timeoutMs: number) {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) throw new Error('Perplexity API key not configured')

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const body = {
      model: 'sonar',
      messages: [
        { role: 'system', content: 'You extract recipes from a single URL and return ONLY valid JSON in the exact format requested.' },
        { role: 'user', content: `Extract a single recipe from this URL and return ONLY valid JSON with this exact structure (no markdown):
{"title":"","description":"","cuisine":"","culturalOrigin":[""],"ingredients":[{"name":"","amount":1,"unit":"each"}],"instructions":[{"step":1,"text":""}],"metadata":{"sourceUrl":"","imageUrl":"","servings":4,"totalTimeMinutes":30,"difficulty":"medium"},"tags":[""]}
URL: ${url}` },
      ],
      max_tokens: 650,
      temperature: 0.2,
      return_citations: false
    }
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    if (!res.ok) throw new Error(`Perplexity error: ${res.status}`)
    const json = await res.json()
    const content = json.choices?.[0]?.message?.content as string | undefined
    if (!content) throw new Error('Empty content from Perplexity')
    const cleaned = content.trim().replace(/^```json\s*/i, '').replace(/^```/i, '').replace(/```\s*$/i, '')
    const parsed = JSON.parse(cleaned)
    return parsed
  } finally {
    clearTimeout(id)
  }
}

function toCreateRecipeInput(url: string, data: any): any {
  // Normalize fields and map to CreateRecipeInput-compatible shape
  const ingredients = Array.isArray(data.ingredients) ? data.ingredients.map((i: any, idx: number) => ({
    id: `ing_${idx + 1}`,
    name: String(i.name || i.ingredient || '').trim(),
    amount: typeof i.amount === 'number' ? i.amount : (parseFloat(i.amount) || 1),
    unit: String(i.unit || i.units || 'each').trim(),
    culturalName: undefined,
    substitutes: [],
    costPerUnit: 0,
    availability: [],
  })) : []

  const instructions = Array.isArray(data.instructions) ? data.instructions.map((s: any, idx: number) => ({
    step: typeof s.step === 'number' ? s.step : (idx + 1),
    description: String(s.text || s.description || s).trim(),
  })) : []

  const servings = (() => {
    const v = data.metadata?.servings ?? data.servings
    const n = typeof v === 'number' ? v : parseInt(String(v || ''), 10)
    return Number.isFinite(n) && n > 0 ? n : 4
  })()

  const totalTimeMinutes = (() => {
    const v = data.metadata?.totalTimeMinutes ?? data.totalTimeMinutes
    const n = typeof v === 'number' ? v : parseInt(String(v || ''), 10)
    return Number.isFinite(n) && n >= 0 ? n : 30
  })()

  const difficulty = (data.metadata?.difficulty || data.difficulty || 'medium') as 'easy'|'medium'|'hard'

  return {
    title: String(data.title || 'Imported Recipe').trim(),
    description: String(data.description || '').trim(),
    culturalOrigin: Array.isArray(data.culturalOrigin) ? data.culturalOrigin : [],
    cuisine: String(data.cuisine || 'international').trim(),
    ingredients,
    instructions,
    metadata: {
      servings,
      prepTime: 0,
      cookTime: 0,
      totalTime: totalTimeMinutes,
      difficulty,
      culturalAuthenticity: 0,
      imageUrl: data.metadata?.imageUrl || data.imageUrl,
      sourceUrl: data.metadata?.sourceUrl || data.sourceUrl || url,
    },
    tags: Array.isArray(data.tags) ? data.tags : [],
    source: 'community',
    isPublic: true,
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pageUrl = searchParams.get('url')
  const requireImage = searchParams.get('requireImage') === '1'

  if (!pageUrl) {
    return NextResponse.json<DetailsResponse>({ success: false, error: 'Missing url parameter' }, { status: 400 })
  }

  try {
    // 1) Try HTML parsing (fast, reliable)
    const htmlRes = await fetchWithTimeout(pageUrl, 8000, { headers: { 'User-Agent': 'Mozilla/5.0 PlateWiseBot' } })
    if (htmlRes.ok) {
      const html = await htmlRes.text()
      const parsed = parseRecipeFromHtml(pageUrl, html)
      if (parsed.recipe) {
        const img = extractImageFromHtml(pageUrl, html)
        const enriched = {
          ...parsed.recipe,
          metadata: {
            ...parsed.recipe.metadata,
            sourceUrl: pageUrl,
            imageUrl: parsed.recipe.metadata.imageUrl || img,
          },
          source: 'community',
          isPublic: true,
        }
        if (!requireImage || enriched.metadata.imageUrl) {
          return NextResponse.json<DetailsResponse>({ success: true, recipe: enriched, used: { method: 'jsonld', imageFallback: !!img } })
        }
      }
    }

    // 2) Fallback to Perplexity single-page extraction
    const data = await extractViaPerplexity(pageUrl, 15000)
    const normalized = toCreateRecipeInput(pageUrl, data)

    if (requireImage && !normalized.metadata.imageUrl) {
      // Try a lightweight HTML fetch for image fallback
      try {
        const res2 = await fetchWithTimeout(pageUrl, 5000)
        if (res2.ok) {
          const html2 = await res2.text()
          const img2 = extractImageFromHtml(pageUrl, html2)
          if (img2) normalized.metadata.imageUrl = img2
        }
      } catch {}
    }

    return NextResponse.json<DetailsResponse>({ success: true, recipe: normalized, used: { method: 'perplexity', imageFallback: !!normalized.metadata.imageUrl } })
  } catch (e: any) {
    console.error('Details endpoint error:', e)
    return NextResponse.json<DetailsResponse>({ success: false, error: e?.message || 'Failed to extract recipe details' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) { return GET(req) }

