import { NextRequest, NextResponse } from 'next/server'
import { storeSuggestionService } from '@/lib/services/store-suggestion-service'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const city = searchParams.get('city') || ''
    const state = searchParams.get('state') || undefined
    const zipCode = searchParams.get('zip') || undefined
    const limit = parseInt(searchParams.get('limit') || '8', 10)

    if (!city) {
      return NextResponse.json({ error: 'city required' }, { status: 400 })
    }

    const suggestions = await storeSuggestionService.suggestMajorChains({ city, state, zipCode, limit })
    return NextResponse.json({ data: suggestions })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

