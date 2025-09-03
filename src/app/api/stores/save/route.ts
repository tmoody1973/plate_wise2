import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SaveStoreInput {
  placeId: string
  chain: string
  name: string
  address: string
  rating?: number
  types?: string[]
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = (await req.json()) as { stores: SaveStoreInput[] }
    const stores = Array.isArray(body?.stores) ? body.stores : []
    if (stores.length === 0) return NextResponse.json({ error: 'no stores provided' }, { status: 400 })

    const rows = stores.map(s => ({
      user_id: user.id,
      store_name: s.name || s.chain,
      store_type: inferStoreType(s.types),
      address: s.address,
      google_place_id: s.placeId,
      specialties: [],
      notes: null,
      rating: s.rating ? Math.round(s.rating) : null,
      is_favorite: false,
    }))

    const { error } = await supabase.from('saved_stores').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
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

