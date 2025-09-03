import { NextRequest, NextResponse } from 'next/server'
import { recommendRecipesFromProfile } from '@/lib/recommendations/tavily-recommender'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const profile = body?.profile ?? {}

    const recs = await recommendRecipesFromProfile(profile)
    return NextResponse.json({ data: recs, timestamp: new Date().toISOString() })
  } catch (e: any) {
    return NextResponse.json(
      { error: { message: e?.message ?? 'Failed to generate recommendations' } },
      { status: 500 }
    )
  }
}

