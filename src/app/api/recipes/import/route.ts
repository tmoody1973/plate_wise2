import { NextRequest, NextResponse } from 'next/server'
import { parseRecipeFromHtml } from '@/lib/recipes/html-recipe-parser'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const url: string = body?.url
    const language: string | undefined = body?.language
    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'valid url required' }, { status: 400 })
    }

    const res = await fetch(url, { headers: { 'User-Agent': 'PlateWise-Importer/1.0' } as any })
    if (!res.ok) {
      return NextResponse.json({ error: `fetch_failed: ${res.status}` }, { status: 502 })
    }
    const html = await res.text()
    const { recipe, reason } = parseRecipeFromHtml(url, html)

    if (recipe) {
      return NextResponse.json({ data: { recipe, sourceUrl: url } })
    }

    // Fallback: try AI parsing with readable text
    const plain = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
    try {
      const { bedrockService } = await import('@/lib/ai/bedrock-service')
      const ai = await bedrockService.parseRecipe(plain, 'text', language || 'en')
      if (ai) {
        return NextResponse.json({ data: { recipe: { ...ai, source: 'user' }, sourceUrl: url }, notes: 'ai-fallback' })
      }
    } catch {}

    return NextResponse.json({ error: `parse_failed: ${reason || 'unknown'}` }, { status: 422 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

