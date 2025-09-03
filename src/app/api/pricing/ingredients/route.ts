import { NextRequest, NextResponse } from 'next/server'
import { getKrogerAccessToken } from '@/lib/external-apis/kroger-oauth'
import { buildSearchTerms, classifyCategory, scoreProductDetailed, type IngredientInput, type ScoreBreakdown } from '@/lib/external-apis/kroger-matching'
import { krogerService } from '@/lib/external-apis/kroger-service'
import { getProductByIdV2, searchProductsV2, normalizeV2ToV1Like } from '@/lib/external-apis/kroger-catalog-v2'

// Minimal types used by this module (subset of Kroger API shapes)
type KrogerPrice = { promo?: number | null; regular?: number | null }
type KrogerItem = { price?: KrogerPrice; size?: string | null | undefined; description?: string | null | undefined; inventory?: { stockLevel?: string } }
export type KrogerProduct = {
  items?: KrogerItem[]
  price?: KrogerPrice
  size?: string | null | undefined
  productId?: string
  upc?: string
  description?: string
  categories?: string[]
  brand?: string
  images?: Array<{ url?: string; sizes?: Array<{ url?: string }> }>
}

export type Candidate = { description?: string; price?: number; size?: string; image?: string; productId?: string; storeId?: string; storeName?: string; category?: string; confidence?: number; signals?: { titleSim: number; sizeProximity: number; categoryMatched: boolean } }
type PriceExplain = { titleSim?: number; sizeProximity?: number; categoryMatched?: boolean; categoryHint?: string; availability?: string; promo?: number | boolean; soupPenaltyApplied?: boolean; price?: number }
type PerIngredientRow = { name: string; unitPrice: number; estimatedCost: number; product?: KrogerProduct; topCandidates?: Candidate[]; packages?: number; packageSize?: string; portionCost?: number; packagePrice?: number; confidence?: number; explain?: PriceExplain }

// moved to kroger-matching.ts

function normalizeUnit(u: string) {
  const s = u.toLowerCase()
  if (['g', 'gram', 'grams'].includes(s)) return 'g'
  if (['kg', 'kilogram', 'kilograms'].includes(s)) return 'kg'
  if (['lb', 'pound', 'pounds'].includes(s)) return 'lb'
  if (['oz', 'ounce', 'ounces'].includes(s)) return 'oz'
  if (['ml', 'milliliter', 'milliliters'].includes(s)) return 'ml'
  if (['l', 'liter', 'liters'].includes(s)) return 'l'
  if (['each', 'ea', 'unit', 'piece'].includes(s)) return 'each'
  return s
}

function parseSize(size?: string): { qty: number; unit: string } | null {
  if (!size) return null
  // Support fluid ounces as volume and ounces as weight
  const m = size.match(/([\d.]+)\s*(fl\s*oz|floz|oz|ounce|ounces|lb|pound|g|gram|kg|kilogram|ml|milliliter|l|liter|ct|count)/i)
  if (!m) return null
  const qty = parseFloat(m[1]!)
  const unit = String(m[2]).toLowerCase()
  return { qty, unit }
}

function toGrams(qty: number, unit: string): number | null {
  switch (unit) {
    case 'g':
    case 'gram':
      return qty
    case 'kg':
    case 'kilogram':
      return qty * 1000
    case 'oz':
    case 'ounce':
    case 'ounces':
      return qty * 28.3495
    case 'lb':
    case 'pound':
      return qty * 453.592
    default:
      return null
  }
}

function toMilliliters(qty: number, unit: string): number | null {
  switch (unit) {
    case 'ml':
    case 'milliliter':
      return qty
    case 'l':
    case 'liter':
      return qty * 1000
    case 'fl oz':
    case 'floz':
      return qty * 29.5735
    case 'oz': // if ambiguous oz used for volume in size strings
      return qty * 29.5735
    default:
      return null
  }
}

// culinary volume helper for ingredient units
function toCulinaryMl(qty: number, unit: string): number | null {
  const u = unit.toLowerCase()
  switch (u) {
    case 'ml': case 'milliliter': return qty
    case 'l': case 'liter': return qty * 1000
    case 'cup': case 'cups': return qty * 240
    case 'tbsp': case 'tablespoon': case 'tablespoons': return qty * 15
    case 'tsp': case 'teaspoon': case 'teaspoons': return qty * 5
    case 'fl oz': case 'floz': return qty * 29.5735
    // sometimes recipes use 'oz' for fluid oz; assume volume
    case 'oz': return qty * 29.5735
    default: return null
  }
}

function toCulinaryGrams(qty: number, unit: string): number | null {
  const u = unit.toLowerCase()
  switch (u) {
    case 'g': case 'gram': case 'grams': return qty
    case 'kg': case 'kilogram': case 'kilograms': return qty * 1000
    case 'lb': case 'pound': case 'pounds': return qty * 453.592
    case 'oz': case 'ounce': case 'ounces': return qty * 28.3495
    default: return null
  }
}

function getProductPrice(product: KrogerProduct): number | null {
  const items = Array.isArray(product?.items) ? product.items : []
  for (const it of items) {
    const p = it?.price
    const val = (p?.promo ?? p?.regular)
    if (typeof val === 'number' && !isNaN(val)) return val
  }
  // Some payloads put price at root
  const root = product?.price?.regular
  return (typeof root === 'number' && !isNaN(root)) ? root : null
}

import { parsePackSize as parsePackSizeUtil, normalizeUnit as normalizeUtilUnit, convert as convertUtil, estimatePacksNeeded as estimatePacksUtil } from '@/utils/units'

function estimateCost(ing: IngredientInput, product: KrogerProduct, servings?: number): { unitPrice: number; estimatedCost: number; packages?: number; packageSize?: string; portionCost?: number; packagePrice?: number } {
  const price = getProductPrice(product) ?? 0
  if (!price) return { unitPrice: 0, estimatedCost: 0 }

  const sizeStr = product?.items?.[0]?.size ?? product?.size ?? undefined
  const parsed = parsePackSizeUtil(sizeStr)
  const unit = normalizeUtilUnit(ing.unit) || 'each'

  if (parsed) {
    const label = `${parsed.qty} ${parsed.unit}`
    let portionCost = 0
    let unitPrice = 0
    if (parsed.unit === 'each') {
      const pieces = Math.max(1, Math.ceil(ing.amount))
      const perPack = Math.max(1, Math.ceil(parsed.qty))
      portionCost = (pieces / perPack) * price
      unitPrice = price / perPack
    } else {
      const needG = convertUtil(ing.amount, unit, 'g')
      const packG = convertUtil(parsed.qty, parsed.unit, 'g')
      if (needG > 0 && packG > 0) {
        portionCost = (needG / packG) * price
        unitPrice = price / packG
      }
    }
    const packages = estimatePacksUtil(ing.amount, unit, parsed.qty, parsed.unit)
    const estimatedCost = portionCost
    return { unitPrice, estimatedCost, packages, packageSize: label, portionCost, packagePrice: price }
  }

  // Fallback: treat as each/unit
  const qty = unit === 'each' ? Math.max(1, Math.ceil(ing.amount)) : ing.amount
  return { unitPrice: price, estimatedCost: price * qty, packages: unit === 'each' ? Math.ceil(qty) : undefined, packageSize: unit === 'each' ? 'each' : undefined, portionCost: price * qty, packagePrice: price }
}

type PricingIngredientsRequest = {
  ingredients: IngredientInput[]
  zip?: string
  locationId?: string
  servings?: number
  preferredProductIds?: Array<{ name: string; productId: string }>
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PricingIngredientsRequest
    const ingredients: IngredientInput[] = body.ingredients || []
    const zip: string | undefined = body.zip
    let locationId: string | undefined = body.locationId
    const servings: number = body.servings || 1
    const preferred: Array<{ name: string; productId: string }> = body.preferredProductIds || []
    if (!ingredients.length) return NextResponse.json({ error: 'ingredients required' }, { status: 400 })

    const useMock = (process.env.NEXT_PUBLIC_KROGER_MOCK ?? 'true') !== 'false' || !process.env.KROGER_CLIENT_ID || !process.env.KROGER_CLIENT_SECRET
    const useV2 = (process.env.USE_KROGER_CATALOG_V2 ?? 'false') === 'true'

    // Mock fallback path (no credentials or explicitly enabled mock)
    if (useMock) {
      const perIngredient: PerIngredientRow[]
        = []
      let totalCost = 0
      for (const ing of ingredients) {
        // use krogerService mock products
        const products = await krogerService.searchProducts({ query: ing.name, limit: 3 })
        const product = products[0]
        const unitPrice = product?.price?.regular || 1
        const estimatedCost = unitPrice * Math.max(1, ing.amount)
        totalCost += estimatedCost
        perIngredient.push({
          name: ing.name,
          unitPrice,
          estimatedCost,
          product,
          topCandidates: products.slice(0, 3).map(p => ({
            productId: p.id,
            description: p.name,
            price: p.price?.regular || 1,
            image: p.images?.[0]?.url,
            category: p.categories?.[0],
            size: p.size,
            confidence: 0.9,
          })),
          confidence: 0.9,
          explain: { titleSim: 1, sizeProximity: 0.5, categoryMatched: true },
        })
      }
      const costPerServing = totalCost / Math.max(servings, 1)
      return NextResponse.json({ data: { perIngredient, totalCost, costPerServing, locationId: locationId || 'mock-location', storeName: 'Mock Kroger', source: 'mock' } })
    }

    let token: string
    try {
      token = await getKrogerAccessToken()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      return NextResponse.json({ error: `oauth_failed: ${message}` }, { status: 502 })
    }

    // Resolve a default locationId from zip if missing
    let storeName: string | undefined
    if (!locationId && zip) {
      const locRes = await fetch(`https://api.kroger.com/v1/locations?filter.zipCode.near=${encodeURIComponent(zip)}&filter.limit=1`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      if (locRes.ok) {
        const raw: unknown = await locRes.json()
        const data = raw as { data?: Array<{ locationId?: string; name?: string }> }
        const store = data?.data?.[0]
        if (store) {
          locationId = store.locationId
          storeName = store.name
        }
      } else {
        const text = await locRes.text().catch(() => '')
        return NextResponse.json({ error: `locations_failed: ${locRes.status} ${text?.slice(0,200)}` }, { status: 502 })
      }
    }

    const perIngredient: PerIngredientRow[] = []
    let totalCost = 0

    for (const ing of ingredients) {
      // Preferred product path: fetch exact product by id if provided for this ingredient
      const pref = preferred.find(p => p?.name?.toLowerCase?.().trim() === ing.name.toLowerCase().trim() && p.productId)
      if (pref && pref.productId && locationId) {
        let prod: KrogerProduct | null = null
        if (useV2) {
          const v2 = await getProductByIdV2(pref.productId, locationId)
          if (v2) prod = normalizeV2ToV1Like(v2) as KrogerProduct
        }
        if (!prod) {
          const url = `https://api.kroger.com/v1/products?filter.productId=${encodeURIComponent(pref.productId)}&filter.locationId=${encodeURIComponent(locationId)}&filter.limit=1`
          const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
          if (resp.ok) {
            const raw: unknown = await resp.json()
            const data = raw as { data?: KrogerProduct[] }
            prod = data?.data?.[0] || null
          }
        }
        if (prod) {
          if (prod) {
            // Fallback: if this product has no price at this store, search by its description
            if (!getProductPrice(prod)) {
              const baseDesc = (prod?.description ?? '') as string
              const firstComma = (baseDesc.split(',')[0] ?? '') as string
              const firstDash = (firstComma.split('-')[0] ?? '') as string
              const desc = firstDash.trim()
              if (desc) {
                let fbProd: KrogerProduct | null = null
                if (useV2) {
                  try {
                    const v2 = await searchProductsV2({ term: desc, locationId, limit: 5 })
                    const normalized = v2.map(normalizeV2ToV1Like) as KrogerProduct[]
                    fbProd = normalized.find(p => getProductPrice(p)) || null
                  } catch {}
                }
                if (!fbProd) {
                  const fallbackParams = [
                    `filter.term=${encodeURIComponent(desc)}`,
                    `filter.locationId=${encodeURIComponent(locationId)}`,
                    'filter.limit=5',
                  ].join('&')
                  const fb = await fetch(`https://api.kroger.com/v1/products?${fallbackParams}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
                  if (fb.ok) {
                    const raw: unknown = await fb.json()
                    const fbJson = raw as { data?: KrogerProduct[] }
                    const list = fbJson?.data || []
                    fbProd = (list as KrogerProduct[]).find((p) => getProductPrice(p)) || null
                  }
                }
                if (fbProd) {
                    const { unitPrice, estimatedCost, packages, packageSize, packagePrice } = estimateCost(ing, fbProd, servings)
                    totalCost += estimatedCost
                    perIngredient.push({ name: ing.name, unitPrice, estimatedCost, product: fbProd, topCandidates: [], packages, packageSize, packagePrice })
                    continue
                }
              }
            }
            const { unitPrice, estimatedCost, packages, packageSize, packagePrice } = estimateCost(ing, prod, servings)
            totalCost += estimatedCost
            perIngredient.push({ name: ing.name, unitPrice, estimatedCost, product: prod, topCandidates: [], packages, packageSize, packagePrice })
            continue
          }
        }
      }
      // Multi-pass search with re-ranking
      const terms = buildSearchTerms(ing)
      const categoryHint = classifyCategory(ing.name)
      const candidates: KrogerProduct[] = []
      if (useV2 && locationId) {
        for (const t of terms) {
          try {
            const v2 = await searchProductsV2({ term: t, locationId, limit: 20 })
            const normalized = v2.map(normalizeV2ToV1Like) as KrogerProduct[]
            candidates.push(...normalized)
          } catch {}
          if (candidates.length >= 20) break
        }
      }
      if (!useV2 || candidates.length === 0) {
        for (const t of terms) {
          const params = [
            `filter.term=${encodeURIComponent(t)}`,
            locationId ? `filter.locationId=${encodeURIComponent(locationId)}` : '',
            'filter.limit=20',
          ].filter(Boolean).join('&')
          const url = `https://api.kroger.com/v1/products?${params}`
          const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
          if (resp.ok) {
            const raw: unknown = await resp.json()
            const data = raw as { data?: KrogerProduct[] }
            const products = data?.data || []
            candidates.push(...(products as KrogerProduct[]))
          }
          if (candidates.length >= 20) break
        }
      }
      // Deduplicate candidates by productId
      const unique: Record<string, KrogerProduct> = {}
      for (const c of candidates) {
        const id = c?.productId || c?.upc || JSON.stringify(c).slice(0,50)
        if (!unique[id]) unique[id] = c
      }
      const uniqueList = Object.values(unique) as KrogerProduct[]
      let product: KrogerProduct | null = null
      // Defaults for optional UI metadata
      let topCandidates: Candidate[] = []
      let selectedConfidence = 0
      let explain: PriceExplain | undefined = undefined
      if (uniqueList.length > 0) {
        const scored: Array<{ p: KrogerProduct; d: ScoreBreakdown }> = uniqueList.map(p => ({ p, d: scoreProductDetailed(ing, p, categoryHint) }))
          .sort((a,b) => b.d.score - a.d.score)
        const withScores = scored.map(x => ({ p: x.p, s: x.d.score, d: x.d }))
        withScores.sort((a,b)=> b.s - a.s)
        // Prefer a candidate that actually has a price at this store
        const firstPriced = withScores.find(x => getProductPrice(x.p))
        product = (firstPriced?.p || withScores[0]?.p) || null
        const clamp = (x: number) => Math.max(0, Math.min(1, x))
        const top = withScores.slice(0,3).map(x => ({
          productId: x.p?.productId,
          description: x.p?.description || x.p?.items?.[0]?.description || undefined,
          price: x.p?.items?.[0]?.price?.promo ?? x.p?.items?.[0]?.price?.regular ?? 0,
          image: x.p?.images?.[0]?.sizes?.[0]?.url || x.p?.images?.[0]?.url,
          category: (x.p?.categories || [])[0],
          size: x.p?.items?.[0]?.size || undefined,
          confidence: clamp(x.s),
          signals: {
            titleSim: x.d.titleSim,
            sizeProximity: x.d.sizeProximity,
            categoryMatched: x.d.categoryMatched,
          }
        }))
        // attach top candidates for UI override later
        // will be added below when we push perIngredient entry
        topCandidates = top
        selectedConfidence = clamp(withScores[0]?.s || 0)
        explain = {
          titleSim: withScores[0]?.d.titleSim,
          sizeProximity: withScores[0]?.d.sizeProximity,
          categoryMatched: withScores[0]?.d.categoryMatched,
          categoryHint,
          availability: withScores[0]?.d.availability,
          promo: withScores[0]?.d.promo,
          soupPenaltyApplied: withScores[0]?.d.soupPenaltyApplied,
          price: withScores[0]?.d.price,
        }
      }

      if (!product) {
        perIngredient.push({ name: ing.name, unitPrice: 0, estimatedCost: 0, topCandidates: [] })
        continue
      }

      const { unitPrice, estimatedCost, packages, packageSize, packagePrice } = estimateCost(ing, product, servings)
      totalCost += estimatedCost
      perIngredient.push({ name: ing.name, unitPrice, estimatedCost, product, topCandidates: (typeof topCandidates !== 'undefined' ? topCandidates : []), confidence: (typeof selectedConfidence !== 'undefined' ? selectedConfidence : 1), explain, packages, packageSize, packagePrice })
    }

    const costPerServing = totalCost / Math.max(servings, 1)
    return NextResponse.json({ data: { perIngredient, totalCost, costPerServing, locationId, storeName, source: 'live' } })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
