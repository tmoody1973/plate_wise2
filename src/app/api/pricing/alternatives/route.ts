import { NextRequest, NextResponse } from 'next/server'
import { getKrogerAccessToken } from '@/lib/external-apis/kroger-oauth'
import { buildSearchTerms, classifyCategory, scoreProductDetailed } from '@/lib/external-apis/kroger-matching'
import { krogerService } from '@/lib/external-apis/kroger-service'
import { searchProductsV2, normalizeV2ToV1Like } from '@/lib/external-apis/kroger-catalog-v2'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const name: string = body?.name
    const query: string | undefined = body?.query
    const limit: number = Math.min( body?.limit || 12, 24)
    const offset: number = Math.max( body?.offset || 0, 0)
    const pricedOnly: boolean = Boolean(body?.pricedOnly)
    const zip: string | undefined = body?.zip
    let locationId: string | undefined = body?.locationId
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const useMock = (process.env.NEXT_PUBLIC_KROGER_MOCK ?? 'true') !== 'false' || !process.env.KROGER_CLIENT_ID || !process.env.KROGER_CLIENT_SECRET
    const useV2 = (process.env.USE_KROGER_CATALOG_V2 ?? 'false') === 'true'

    let token: string | undefined
    if (!useMock) {
      try {
        token = await getKrogerAccessToken()
      } catch (e: any) {
        return NextResponse.json({ error: `oauth_failed: ${e?.message || 'could not get token'}` }, { status: 502 })
      }
    }

    // Resolve a default locationId from zip if missing
    if (!useMock && !locationId && zip) {
      const locRes = await fetch(`https://api.kroger.com/v1/locations?filter.zipCode.near=${encodeURIComponent(zip)}&filter.limit=1`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      if (locRes.ok) {
        const data = await locRes.json()
        const store = data?.data?.[0]
        if (store) {
          locationId = store.locationId
        }
      }
    }

    const terms = query ? [query] : buildSearchTerms({ name, amount: 1, unit: 'each' })
    const categoryHint = classifyCategory(name)
    let candidates: any[] = []
    const hasPrice = (p: any): boolean => {
      const items = Array.isArray(p?.items) ? p.items : []
      for (const it of items) {
        const v = it?.price?.promo ?? it?.price?.regular
        if (typeof v === 'number' && !isNaN(v)) return true
      }
      const root = p?.price?.regular
      return typeof root === 'number' && !isNaN(root)
    }
    if (useMock) {
      // Use internal mock service
      const mocks = await krogerService.searchProducts({ query: terms[0], limit: limit + offset })
      candidates = mocks.slice(offset, offset + limit).map(m => ({
        productId: m.id,
        description: m.name,
        items: [{ price: { regular: m.price?.regular, promo: m.price?.promo }, size: m.size }],
        images: [{ url: m.images?.[0]?.url }],
        categories: m.categories,
        _storeId: locationId || 'mock-location',
        _storeName: 'Mock Kroger',
      }))
    } else {
      if (useV2 && locationId) {
        for (const t of terms) {
          try {
            const v2 = await searchProductsV2({ term: t, locationId, limit, start: offset })
            const mapped = v2.map(p => ({ ...normalizeV2ToV1Like(p), _storeId: locationId, _storeName: undefined }))
            candidates.push(...mapped)
          } catch {}
          if (candidates.length >= limit) break
        }
      }
      // Fallback to v1 if v2 returned nothing
      if (!useV2 || candidates.length === 0) {
        for (const t of terms) {
          const params = [
            `filter.term=${encodeURIComponent(t)}`,
            locationId ? `filter.locationId=${encodeURIComponent(locationId)}` : '',
            `filter.limit=${encodeURIComponent(String(limit))}`,
            offset ? `filter.start=${encodeURIComponent(String(offset))}` : '',
          ].filter(Boolean).join('&')
          const url = `https://api.kroger.com/v1/products?${params}`
          const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
          if (resp.ok) {
            const data = await resp.json()
            const products = (data?.data || []).map((p: any)=> ({ ...p, _storeId: locationId, _storeName: undefined }))
            candidates.push(...products)
          }
          if (candidates.length >= limit) break
        }
      }
    }

    const unique: Record<string, any> = {}
    for (const c of candidates) {
      const id = c?.productId || c?.upc || JSON.stringify(c).slice(0,50)
      if (!unique[id]) unique[id] = c
    }
    let uniqueList = Object.values(unique)
    if (pricedOnly) {
      uniqueList = uniqueList.filter((p: any) => hasPrice(p))
    }
    let scored = uniqueList.map(p => ({ p, d: scoreProductDetailed({ name, amount: 1, unit: 'each' }, p, categoryHint) }))
      .map(x => ({
        productId: x.p?.productId,
        description: x.p?.description || x.p?.items?.[0]?.description,
        price: x.p?.items?.[0]?.price?.promo ?? x.p?.items?.[0]?.price?.regular ?? 0,
        image: x.p?.images?.[0]?.sizes?.[0]?.url || x.p?.images?.[0]?.url,
        category: (x.p?.categories || [])[0],
        size: x.p?.items?.[0]?.size,
        confidence: Math.max(0, Math.min(1, x.d.score)),
        storeId: x.p?._storeId,
        storeName: x.p?._storeName,
        priced: hasPrice(x.p),
        signals: { titleSim: x.d.titleSim, sizeProximity: x.d.sizeProximity, categoryMatched: x.d.categoryMatched },
      }))
      .sort((a,b) => b.confidence - a.confidence)

    // Nearby-store fallback: if pricedOnly and no priced results at this store, try nearby stores by ZIP
    if (!useMock && pricedOnly && (!scored.length || scored.every(c => !c.priced)) && zip) {
      try {
        const locRes = await fetch(`https://api.kroger.com/v1/locations?filter.zipCode.near=${encodeURIComponent(zip)}&filter.radiusInMiles=12&filter.limit=5`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
        if (locRes.ok) {
          const locJson = await locRes.json()
          const stores = (locJson?.data || []).filter((s: any) => s?.locationId !== locationId)
          const priced: any[] = []
          for (const store of stores) {
            for (const t of terms) {
              const params = [
                `filter.term=${encodeURIComponent(t)}`,
                `filter.locationId=${encodeURIComponent(store.locationId)}`,
                'filter.limit=10',
              ].join('&')
              const url = `https://api.kroger.com/v1/products?${params}`
              const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
              if (r.ok) {
                const dj = await r.json()
                const addr = store?.address?.addressLine1 || store?.address?.addressLine || store?.address?.line1 || undefined
                const city = store?.address?.city || store?.address?.locality || undefined
                const state = store?.address?.state || store?.address?.region || undefined
                const zipc = store?.address?.zipCode || store?.address?.postalCode || undefined
                const composedAddr = [addr, city, state].filter(Boolean).join(', ') + (zipc ? ` ${zipc}` : '')
                const prods = (dj?.data || []).filter((p: any)=> hasPrice(p)).map((p: any) => ({ ...p, _storeId: store.locationId, _storeName: store.name, _storeAddress: composedAddr || undefined }))
                priced.push(...prods)
              }
              if (priced.length >= limit) break
            }
            if (priced.length >= limit) break
          }
          if (priced.length) {
            scored = priced.map(p => ({ p, d: scoreProductDetailed({ name, amount: 1, unit: 'each' }, p, categoryHint) }))
              .map(x => ({
                productId: x.p?.productId,
                description: x.p?.description || x.p?.items?.[0]?.description,
                price: x.p?.items?.[0]?.price?.promo ?? x.p?.items?.[0]?.price?.regular ?? 0,
                image: x.p?.images?.[0]?.sizes?.[0]?.url || x.p?.images?.[0]?.url,
                category: (x.p?.categories || [])[0],
                size: x.p?.items?.[0]?.size,
                confidence: Math.max(0, Math.min(1, x.d.score)),
                storeId: x.p?._storeId,
                storeName: x.p?._storeName,
                storeAddress: x.p?._storeAddress,
                priced: true,
                signals: { titleSim: x.d.titleSim, sizeProximity: x.d.sizeProximity, categoryMatched: x.d.categoryMatched },
              }))
              .sort((a,b) => b.confidence - a.confidence)
          }
        }
      } catch (e) {
        console.warn('nearby store fallback failed', e)
      }
    }

    return NextResponse.json({ data: { topCandidates: scored.slice(0, limit), total: scored.length, offset, limit } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
