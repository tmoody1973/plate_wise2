import { NextRequest, NextResponse } from 'next/server'
// Lazy-load services to avoid constructor throws when keys are missing

export const runtime = 'edge'
export const preferredRegion = ['cle1']
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const locationString: string = body?.location || 'Atlanta, GA'
    const radiusMeters: number = Math.min(25000, Math.max(1000, Number(body?.radius || 10000))) // 1–25km
    const maxResults: number = Math.min(20, Math.max(5, Number(body?.maxResults || 12)))

    // Geocode the provided location string
    let geo = null as any
    try {
      if (process.env.GOOGLE_PLACES_API_KEY) {
        const { geocodingService } = await import('@/lib/external-apis/geocoding-service')
        geo = await geocodingService.geocodeAddress(locationString)
      }
    } catch (e) {
      // If Google key missing, geocodingService throws; fall back to simple parse
      const parts = locationString.split(',').map((s: string) => s.trim())
      geo = {
        city: parts[0] || 'Atlanta',
        state: parts[1] || 'GA',
        zipCode: '',
        coordinates: { lat: 33.781, lng: -84.388 },
      }
    }

    const outLocation = {
      city: geo?.city || 'Atlanta',
      state: geo?.state || 'GA',
      zipCode: geo?.zipCode || '',
      coordinates: geo?.coordinates || { lat: 33.781, lng: -84.388 },
    }

    // Find nearby grocery stores if Places is available; otherwise use fallback list
    let storeNames: string[] = []
    try {
      if (process.env.GOOGLE_PLACES_API_KEY) {
        const { googlePlacesService } = await import('@/lib/external-apis/google-places-service')
        const stores = await googlePlacesService.findNearbyGroceryStores(outLocation.coordinates, radiusMeters)
        storeNames = stores
          .map(s => s.name)
          .filter(Boolean)
          .slice(0, maxResults)
      } else {
        throw new Error('no_google_places_key')
      }
    } catch {
      // Fallback per city/state
      const fallbackByState: Record<string, string[]> = {
        GA: ["Kroger", "Publix", "Walmart", "Target", "Whole Foods Market", "Aldi", "H Mart", "Trader Joe's"],
        WI: ["Pick 'n Save", "Metro Market", "Woodman's", "Walmart", "Target", "Aldi", "Whole Foods Market"],
        CA: ["Safeway", "Ralphs", "Trader Joe's", "Whole Foods Market", "Vons", "Sprouts", "Target", "Walmart"],
      }
      storeNames = fallbackByState[outLocation.state as keyof typeof fallbackByState] || [
        'Walmart', 'Target', 'Aldi', 'Costco', 'Sam\'s Club', 'Whole Foods Market', 'Trader Joe\'s'
      ]
      storeNames = storeNames.slice(0, maxResults)
    }

    return NextResponse.json({
      success: true,
      location: outLocation,
      storeNames,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'discover_failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const loc = req.nextUrl.searchParams.get('location') || 'Atlanta, GA'
  const radius = Number(req.nextUrl.searchParams.get('radius') || 10000)
  const maxResults = Number(req.nextUrl.searchParams.get('maxResults') || 12)
  return POST(new NextRequest(req.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: loc, radius, maxResults })
  }))
}
