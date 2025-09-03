import { NextRequest, NextResponse } from 'next/server'
import { searchMoreRecipes } from '@/lib/recipes/search'
import { upsertRecipes } from '@/lib/recipes/db'

export async function GET() {
  return NextResponse.json({ ok: true, message: 'Use POST with { previous, ...filters } to continue searching.' })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const previous = body?.previous
    if (!previous || typeof previous !== 'object') {
      return NextResponse.json({ error: 'previous results required' }, { status: 400 })
    }
    const filters = {
      query: body?.query as string | undefined,
      country: body?.country as string | undefined,
      includeIngredients: Array.isArray(body?.includeIngredients)
        ? (body.includeIngredients as string[])
        : undefined,
      excludeIngredients: Array.isArray(body?.excludeIngredients)
        ? (body.excludeIngredients as string[])
        : undefined,
      maxResults: typeof body?.maxResults === 'number' ? (body.maxResults as number) : undefined,
      excludeSources: Array.isArray(body?.excludeSources)
        ? (body.excludeSources as string[])
        : undefined,
    }

    const results = await searchMoreRecipes(previous, filters)
    const { rows } = await upsertRecipes(results.recipes)
    return NextResponse.json({ found: results.recipes.length, rows, results })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
