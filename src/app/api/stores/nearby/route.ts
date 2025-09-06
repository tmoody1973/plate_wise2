import { NextRequest, NextResponse } from 'next/server'
import { googlePlacesService } from '@/lib/external-apis/google-places-service'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const zip = searchParams.get('zip') || ''
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    
    if (!zip) {
      return NextResponse.json({ error: 'zip required' }, { status: 400 })
    }

    // Search for grocery stores near the zip code
    const query = `grocery stores near ${zip}`
    const stores = await googlePlacesService.searchStores(query)
    
    // Map to simpler format and limit results
    const mapped = stores.slice(0, limit).map((store) => ({
      id: store.id,
      name: store.name,
      address: store.address,
      distance: store.distance,
      rating: store.rating,
      userRatingsTotal: (store as any).userRatingsTotal,
      openNow: store.openNow, // Use the correct field name from GroceryStore interface
      photos: store.photos,
      phone: store.phone,
      website: store.website,
      location: store.location,
      features: (store as any).features
    }))

    return NextResponse.json({ data: mapped })
  } catch (e: any) {
    console.error('Error finding nearby stores:', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}