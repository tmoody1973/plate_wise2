import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { storeId, isFavorite } = await req.json()
    
    if (!storeId || typeof isFavorite !== 'boolean') {
      return NextResponse.json({ error: 'storeId and isFavorite are required' }, { status: 400 })
    }

    // Update the favorite status
    const { error } = await supabase
      .from('saved_stores')
      .update({ is_favorite: isFavorite })
      .eq('id', storeId)
      .eq('user_id', user.id) // Ensure user can only update their own stores

    if (error) {
      console.error('Database update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Update favorite error:', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}