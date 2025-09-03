import { NextRequest, NextResponse } from 'next/server'
import { recipeDatabaseService } from '@/lib/recipes/recipe-database-service'
import { parseRecipeFromHtml } from '@/lib/recipes/html-recipe-parser'
import { normalizeIngredients } from '@/lib/recipes/ingredient-normalizer'

function extractOgImage(html: string): string | undefined {
  const m = html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i)
  if (m && m[1]) return m[1]
  const m2 = html.match(/<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i)
  if (m2 && m2[1]) return m2[1]
  return undefined
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': 'PlateWise-Backfill/1.0' } as any, cache: 'no-store', redirect: 'follow' } as RequestInit)
  if (!res.ok) throw new Error(`fetch_failed:${res.status}`)
  return await res.text()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const userId = String(body?.userId || '')
    if (!userId) return NextResponse.json({ error: 'missing userId' }, { status: 400 })

    const recipes = await recipeDatabaseService.getUserRecipes(userId, true)
    let scanned = 0, updated = 0

    for (const r of recipes) {
      scanned++
      const srcUrl: string | undefined = (r as any)?.metadata?.sourceUrl || (r as any)?.metadata?.source_url
      const needsImage = !(r as any)?.metadata?.imageUrl
      const needsUnits = (r.ingredients || []).some(ing => !ing.unit || ing.amount === 0)
      if (!needsImage && !needsUnits) continue
      if (!srcUrl) continue
      try {
        const html = await fetchHtml(srcUrl)
        const { recipe: imported } = parseRecipeFromHtml(srcUrl, html)
        const image = extractOgImage(html)
        const patch: any = { id: r.id }
        let shouldUpdate = false
        if (imported && needsUnits) {
          patch.ingredients = normalizeIngredients(imported.ingredients)
          patch.instructions = imported.instructions
          patch.metadata = {
            ...r.metadata,
            servings: imported.metadata.servings || r.metadata.servings,
            totalTime: imported.metadata.totalTime || r.metadata.totalTime,
          }
          shouldUpdate = true
        }
        if (needsImage && image) {
          patch.metadata = { ...(patch.metadata || r.metadata), imageUrl: image }
          shouldUpdate = true
        }
        if (shouldUpdate) {
          await recipeDatabaseService.updateRecipe(patch, r.authorId || userId)
          updated++
        }

        // Cost estimate if still missing
        const refreshed = await recipeDatabaseService.getRecipeById(r.id)
        if (refreshed && (!refreshed.costAnalysis || !refreshed.costAnalysis.costPerServing)) {
          const { estimateRecipeCost } = await import('@/lib/recipes/cost-estimator')
          const { totalCost, costPerServing } = estimateRecipeCost(refreshed.ingredients as any, refreshed.metadata.servings)
          await recipeDatabaseService.updateRecipe({ id: r.id, costAnalysis: { totalCost, costPerServing, storeComparison: [], seasonalTrends: [], bulkBuyingOpportunities: [], couponSavings: [], alternativeIngredients: [] } as any }, r.authorId || userId)
        }
      } catch {}
    }

    return NextResponse.json({ ok: true, scanned, updated })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
