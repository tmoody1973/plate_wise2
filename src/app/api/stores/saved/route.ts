import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    // Fetch saved stores for the user
    const { data: stores, error } = await supabase
      .from('saved_stores')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate distance if user has location (simplified for now)
    const storesWithDistance = stores.map(store => ({
      ...store,
      distance: store.latitude && store.longitude 
        ? Math.round(Math.random() * 10 + 1) // Mock distance for now
        : undefined
    }))

    return NextResponse.json({ stores: storesWithDistance })
  } catch (e: any) {
    console.error('Fetch saved stores error:', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}