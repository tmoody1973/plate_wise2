import { NextRequest, NextResponse } from 'next/server'
import { tavilyService } from '@/lib/external-apis/tavily-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    let q: string = body?.q || ''
    const country: string | undefined = body?.country
    const cuisines: string[] | undefined = body?.cuisines
    if (!q) return NextResponse.json({ error: 'q required' }, { status: 400 })

    // Build culturally-aware query
    if (q && !/\brecipe\b/i.test(q)) q = `${q} recipe`
    const terms: string[] = [q]
    if (country) terms.unshift(`authentic traditional ${country} recipe`)
    if (Array.isArray(cuisines) && cuisines.length) terms.unshift(`authentic ${cuisines.join(' ')} recipe`)
    const query = terms.join(' ')

    const res = await tavilyService.search(query, { searchDepth: 'advanced', maxResults: 8 })
    return NextResponse.json({ data: res.results })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
