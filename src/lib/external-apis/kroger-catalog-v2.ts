import { getKrogerAccessToken } from '@/lib/external-apis/kroger-oauth'

// Lightweight adapter for Kroger Catalog API v2
// Normalizes v2 products into a v1-like shape used by existing code paths.

export type V2Item = {
  size?: string
  price?: { regular?: number; promo?: number; currency?: string; startDate?: string; endDate?: string }
  inventory?: { stockLevel?: string }
}

export type V2Product = {
  productId: string
  description: string
  categories?: string[]
  images?: Array<{ url: string }>
  items?: V2Item[]
}

const BASE = 'https://api.kroger.com'

export async function searchProductsV2(params: {
  term?: string
  locationId: string
  fulfillment?: 'inStore' | 'pickup' | 'delivery'
  limit?: number
  start?: number
}): Promise<V2Product[]> {
  const token = await getKrogerAccessToken()
  const qp = new URLSearchParams()
  if (params.term) qp.set('filter.term', params.term)
  qp.set('filter.locationId', params.locationId)
  qp.set('filter.fulfillment', params.fulfillment || 'inStore')
  if (params.limit) qp.set('filter.limit', String(params.limit))
  if (params.start) qp.set('filter.start', String(params.start))

  const res = await fetch(`${BASE}/catalog/v2/products?${qp.toString()}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    // @ts-ignore
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`v2 search failed: ${res.status}`)
  const json = await res.json()
  return (json?.data || []) as V2Product[]
}

export async function getProductByIdV2(productId: string, locationId: string, fulfillment: 'inStore' | 'pickup' | 'delivery' = 'inStore'): Promise<V2Product | null> {
  const token = await getKrogerAccessToken()
  const qp = new URLSearchParams()
  qp.set('filter.locationId', locationId)
  qp.set('filter.fulfillment', fulfillment)
  // Per v2 docs, productIds plural is used to fetch specific ids
  qp.set('filter.productIds', productId)
  const res = await fetch(`${BASE}/catalog/v2/products?${qp.toString()}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    // @ts-ignore
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = await res.json()
  const list = (json?.data || []) as V2Product[]
  return list[0] || null
}

// Normalize to a v1-like object used elsewhere in the codebase
export function normalizeV2ToV1Like(p: V2Product): any {
  const first = Array.isArray(p.items) ? p.items[0] : undefined
  return {
    productId: p.productId,
    description: p.description,
    categories: p.categories || [],
    images: p.images?.length && p.images[0] ? [{ url: p.images[0].url }] : [],
    items: [{
      size: first?.size,
      price: {
        regular: first?.price?.regular,
        promo: first?.price?.promo,
      },
      inventory: { stockLevel: first?.inventory?.stockLevel },
    }],
  }
}

