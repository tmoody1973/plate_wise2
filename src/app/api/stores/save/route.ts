import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SaveStoreInput {
  placeId: string
  chain?: string
  name: string
  address: string
  rating?: number
  types?: string[]
  website?: string
  phone?: string
  location?: {
    lat: number
    lng: number
  }
  userRatingsTotal?: number
  priceLevel?: number
  features?: any
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) {
      console.log('No user found in store save API')
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as { stores: SaveStoreInput[] }
    console.log('Store save API body:', JSON.stringify(body, null, 2))
    
    const stores = Array.isArray(body?.stores) ? body.stores : []
    if (stores.length === 0) {
      console.log('No stores provided in request')
      return NextResponse.json({ error: 'no stores provided' }, { status: 400 })
    }

    const rows = stores.map(s => ({
      user_id: user.id,
      store_name: s.name || s.chain || '',
      store_type: inferStoreType(s.types),
      address: s.address,
      google_place_id: s.placeId,
      specialties: [],
      notes: null,
      rating: s.rating ? Math.round(s.rating) : null,
      is_favorite: false,
      // Add the new fields
      store_url: s.website || null,
      phone: s.phone || null,
      latitude: s.location?.lat || null,
      longitude: s.location?.lng || null,
      price_level: s.priceLevel || null,
      user_ratings_total: s.userRatingsTotal || null,
      store_features: s.features || {}
    }))

    console.log('Attempting to insert rows:', JSON.stringify(rows, null, 2))
    
    const { data, error } = await supabase.from('saved_stores').insert(rows)
    if (error) {
      console.error('Database insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('Successfully inserted stores:', data)
    return NextResponse.json({ ok: true, inserted: rows.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

function inferStoreType(types?: string[]): string {
  const t = (types || []).map(x => x.toLowerCase())
  if (t.includes('supermarket')) return 'supermarket'
  if (t.includes('grocery_or_supermarket') || t.includes('grocery_store')) return 'grocery'
  return 'grocery'
}

