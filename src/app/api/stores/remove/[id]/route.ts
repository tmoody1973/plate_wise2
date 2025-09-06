import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { id: storeId } = await params
    
    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 })
    }

    // Delete the store
    const { error } = await supabase
      .from('saved_stores')
      .delete()
      .eq('id', storeId)
      .eq('user_id', user.id) // Ensure user can only delete their own stores

    if (error) {
      console.error('Database delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Delete store error:', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}