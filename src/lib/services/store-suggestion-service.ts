/**
 * Store Suggestion Service
 * Suggests major grocery chains for a user's city/ZIP and validates via Google Places
 */

import { googlePlacesService, type PlaceDetails, type PlaceResult } from '@/lib/external-apis/google-places-service'

export interface StoreSuggestion {
  placeId: string
  chain: string
  name: string
  address: string
  city?: string
  state?: string
  zip?: string
  rating?: number
  userRatingsTotal?: number
  types: string[]
}

export interface SuggestStoresInput {
  city: string
  state?: string
  zipCode?: string
  limit?: number
}

// Canonical chain list with common aliases. Ordered by typical coverage/likelihood.
const CHAIN_ALLOWLIST: Array<{ chain: string; aliases: string[] }> = [
  { chain: 'Walmart', aliases: ['walmart'] },
  { chain: 'Target', aliases: ['target'] },
  { chain: 'Kroger', aliases: ['kroger', "pick 'n save", 'metro market', 'ralphs', "fry's", 'king soopers', "smith's", 'fred meyer', 'qfc', 'harris teeter'] },
  { chain: 'Albertsons/Safeway', aliases: ['safeway', 'albertsons', 'vons', 'jewel-osco', "shaw's", 'acme', 'randalls', 'tom thumb', 'pavilions'] },
  { chain: 'Costco', aliases: ['costco'] },
  { chain: "Sam's Club", aliases: ["sam's club"] },
  { chain: 'ALDI', aliases: ['aldi'] },
  { chain: 'H‑E‑B', aliases: ['h-e-b', 'heb'] },
  { chain: 'Publix', aliases: ['publix'] },
  { chain: 'Meijer', aliases: ['meijer'] },
  { chain: 'Whole Foods', aliases: ['whole foods', 'whole foods market'] },
  { chain: 'Trader Joe\'s', aliases: ["trader joe's", 'trader joes'] },
  { chain: 'Food Lion', aliases: ['food lion'] },
  { chain: 'Giant', aliases: ['giant food', 'giant'] },
  { chain: 'Stop & Shop', aliases: ['stop & shop', 'stop and shop'] },
  { chain: 'Hy-Vee', aliases: ['hy-vee', 'hy vee'] },
  { chain: 'Sprouts', aliases: ['sprouts'] },
  { chain: 'ShopRite', aliases: ['shoprite', 'shop rite'] },
  { chain: 'Wegmans', aliases: ['wegmans'] },
  { chain: 'WinCo', aliases: ['winco'] },
]

// Basic type check for qualifying as a grocery store
function isGroceryType(types: string[] | undefined): boolean {
  if (!types) return false
  const set = new Set(types.map(t => t.toLowerCase()))
  return set.has('supermarket') || set.has('grocery_or_supermarket') || set.has('grocery_store')
}

function normalizeText(s?: string): string {
  return (s || '').trim().toLowerCase()
}

function extractFromAddressComponents(details?: PlaceDetails): { city?: string; state?: string; zip?: string } {
  const comps = details?.address_components || []
  const find = (type: string) => comps.find(c => c.types.includes(type))
  const city = find('locality')?.long_name || find('postal_town')?.long_name || find('sublocality')?.long_name
  const state = find('administrative_area_level_1')?.short_name
  const zip = find('postal_code')?.long_name
  return { city, state, zip }
}

function matchesCityZip(
  details: PlaceDetails | null,
  target: { city?: string; state?: string; zipCode?: string }
): boolean {
  if (!details) return false
  const { city, state, zip } = extractFromAddressComponents(details)
  const tCity = normalizeText(target.city)
  const tState = normalizeText(target.state)
  const tZip = normalizeText(target.zipCode)
  const dCity = normalizeText(city)
  const dState = normalizeText(state)
  const dZip = normalizeText(zip)

  // Prefer exact ZIP match if provided
  if (tZip && dZip) return tZip === dZip
  // Fall back to city + state match
  if (tCity && dCity && tCity !== dCity) return false
  if (tState && dState && tState !== dState) return false
  return true
}

function mapSuggestion(place: PlaceResult, details: PlaceDetails | null, chain: string): StoreSuggestion {
  const addr = details?.formatted_address || place.formatted_address
  const comps = extractFromAddressComponents(details || (place as any))
  return {
    placeId: place.place_id,
    chain,
    name: place.name,
    address: addr,
    city: comps.city,
    state: comps.state,
    zip: comps.zip,
    rating: place.rating,
    userRatingsTotal: place.user_ratings_total,
    types: place.types || [],
  }
}

export class StoreSuggestionService {
  /**
   * Suggest up to N major chain stores for a city/ZIP and validate with Places
   */
  async suggestMajorChains(input: SuggestStoresInput): Promise<StoreSuggestion[]> {
    const { city, state, zipCode, limit = 8 } = input
    const locationLabel = state ? `${city}, ${state}` : city

    const results: StoreSuggestion[] = []
    const seenPlaceIds = new Set<string>()

    for (const entry of CHAIN_ALLOWLIST) {
      if (results.length >= limit) break

      // Try each alias until we get a good hit for this chain in the city
      let bestCandidate: { store: import('@/lib/external-apis/google-places-service').GroceryStore; details: PlaceDetails | null } | null = null

      for (const alias of entry.aliases) {
        try {
          const query = `${alias} in ${locationLabel}`
          const stores = await googlePlacesService.searchStores(query)
          // Prefer supermarket/grocery types via normalized storeType
          const candidates = (stores || [])
            .filter(s => s.storeType === 'supermarket' || s.storeType === 'grocery')
            .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))

          for (const store of candidates) {
            // Fetch details for accurate address components and status
            const details = await googlePlacesService.getPlaceDetails(store.id)
            if (!details) {
              console.log(`No details for store ${store.name}`)
              continue
            }
            const businessOk = !details.business_status || details.business_status === 'OPERATIONAL'
            const reviewOk = (details.user_ratings_total || 0) >= 10  // Lowered from 50
            const ratingOk = (store.rating || 0) >= 3.5  // Lowered from 3.8
            
            console.log(`Store ${store.name}: business=${businessOk}, reviews=${details.user_ratings_total}(${reviewOk}), rating=${store.rating}(${ratingOk})`)
            
            if (businessOk && reviewOk && ratingOk) {
              bestCandidate = { store, details }
              break
            }
          }

          if (bestCandidate) break
        } catch (err) {
          // Non-fatal; move to next alias/chain
          // console.warn('Alias search failed', alias, err)
        }
      }

      if (bestCandidate) {
        const { store, details } = bestCandidate
        const placeId = (details && details.place_id) || store.id
        if (!seenPlaceIds.has(placeId)) {
          const comps = extractFromAddressComponents(details || undefined)
          results.push({
            placeId,
            chain: entry.chain,
            name: store.name,
            address: (details && details.formatted_address) || store.address,
            city: comps.city,
            state: comps.state,
            zip: comps.zip,
            rating: store.rating,
            userRatingsTotal: details?.user_ratings_total,
            types: (details?.types || []) as string[],
          })
          seenPlaceIds.add(placeId)
        }
      }
    }

    return results.slice(0, limit)
  }
}

export const storeSuggestionService = new StoreSuggestionService()
