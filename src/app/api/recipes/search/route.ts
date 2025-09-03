import { NextRequest, NextResponse } from 'next/server'
import { findAndStoreRecipes } from '@/lib/recipes/import'
import { searchRecipes, searchRecipesFast } from '@/lib/recipes/search'

export async function GET() {
  return NextResponse.json({ ok: true, message: 'Use POST with filters to search recipes.' })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    // Allow missing fields; we apply defaults and instruct the model to proceed without asking for more details
    const filters = {
      query: body?.query as string | undefined,
      country: (typeof body?.country === 'string' && body.country.trim()) ? String(body.country).trim() : 'United States',
      includeIngredients: Array.isArray(body?.includeIngredients)
        ? (body.includeIngredients as string[])
        : undefined,
      excludeIngredients: Array.isArray(body?.excludeIngredients)
        ? (body.excludeIngredients as string[])
        : undefined,
      maxResults: typeof body?.maxResults === 'number' ? (body.maxResults as number) : 5,
      excludeSources: Array.isArray(body?.excludeSources)
        ? (body.excludeSources as string[])
        : undefined,
    }

    // Run search and upsert; also include structured results for client-side continuation
    const mode = typeof body?.mode === 'string' ? String(body.mode) : 'web'
    const results = mode === 'fast' ? await searchRecipesFast(filters) : await searchRecipes(filters)
    const { rows } = await (await import('@/lib/recipes/db')).upsertRecipes(results.recipes)
    return NextResponse.json({ found: results.recipes.length, rows, results })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
