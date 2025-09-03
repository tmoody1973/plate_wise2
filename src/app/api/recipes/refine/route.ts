import { NextRequest, NextResponse } from 'next/server'
import { recipeDatabaseService } from '@/lib/recipes/recipe-database-service'
import { parseRecipeFromHtml } from '@/lib/recipes/html-recipe-parser'
import { normalizeIngredients } from '@/lib/recipes/ingredient-normalizer'

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': 'PlateWise-Refiner/1.0' } as any, cache: 'no-store', redirect: 'follow' } as RequestInit)
  if (!res.ok) throw new Error(`fetch_failed:${res.status}`)
  return await res.text()
}

async function findPrimaryImage(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/extract-recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (!res.ok) return undefined
    const j = await res.json().catch(() => ({}))
    const img: string | undefined = Array.isArray(j?.images) && j.images.length ? j.images[0] : undefined
    return img
  } catch {
    return undefined
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const id = String(body?.id || '')
    const overrideUrl = body?.url ? String(body.url) : undefined
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

    const existing = await recipeDatabaseService.getRecipeById(id)
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const sourceUrl = overrideUrl || (existing as any)?.metadata?.sourceUrl || (existing as any)?.metadata?.source_url
    if (!sourceUrl) return NextResponse.json({ error: 'missing source url' }, { status: 400 })

    const html = await fetchText(sourceUrl)
    const { recipe: imported } = parseRecipeFromHtml(sourceUrl, html)
    if (!imported) return NextResponse.json({ error: 'parse_failed' }, { status: 422 })

    // Merge: prefer imported ingredients/instructions; preserve existing metadata where sensible
    const updated = await recipeDatabaseService.updateRecipe({
      id,
      ingredients: normalizeIngredients(imported.ingredients),
      instructions: imported.instructions,
      metadata: {
        ...existing.metadata,
        servings: imported.metadata.servings || existing.metadata.servings,
        totalTime: imported.metadata.totalTime || existing.metadata.totalTime,
      } as any,
    }, existing.authorId || '')

    // Try to attach an image if missing
    if (updated && !(updated as any)?.metadata?.imageUrl) {
      const img = await findPrimaryImage(sourceUrl)
      if (img) {
        await recipeDatabaseService.updateRecipe({
          id,
          metadata: { ...updated.metadata, imageUrl: img } as any,
        }, updated.authorId || '')
      }
    }

    // Attach heuristic cost if missing
    let finalRecipe = await recipeDatabaseService.getRecipeById(id)
    if (finalRecipe && (!finalRecipe.costAnalysis || !finalRecipe.costAnalysis.costPerServing)) {
      const { estimateRecipeCost } = await import('@/lib/recipes/cost-estimator')
      const { totalCost, costPerServing } = estimateRecipeCost(finalRecipe.ingredients as any, finalRecipe.metadata.servings)
      await recipeDatabaseService.updateRecipe({ id, costAnalysis: { totalCost, costPerServing, storeComparison: [], seasonalTrends: [], bulkBuyingOpportunities: [], couponSavings: [], alternativeIngredients: [] } as any }, finalRecipe.authorId || '')
      finalRecipe = await recipeDatabaseService.getRecipeById(id)
    }
    return NextResponse.json({ ok: true, recipe: finalRecipe })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
