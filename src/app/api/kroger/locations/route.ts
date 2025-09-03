import { NextRequest, NextResponse } from 'next/server'
import { getKrogerAccessToken } from '@/lib/external-apis/kroger-oauth'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const zip = searchParams.get('zip') || ''
    const radius = searchParams.get('radius') || '10'
    if (!zip) return NextResponse.json({ error: 'zip required' }, { status: 400 })

    const token = await getKrogerAccessToken()
    const url = `https://api.kroger.com/v1/locations?filter.zipCode.near=${encodeURIComponent(zip)}&filter.radiusInMiles=${encodeURIComponent(radius)}&filter.limit=5`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store' as any,
    })
    if (!res.ok) return NextResponse.json({ error: `kroger ${res.status}` }, { status: res.status })
    const data = await res.json()
    const mapped = (data?.data || []).map((l: any) => ({
      id: l.locationId,
      name: l.name,
      address: l.address,
    }))
    return NextResponse.json({ data: mapped })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

