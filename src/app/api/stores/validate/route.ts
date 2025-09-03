import { NextRequest, NextResponse } from 'next/server'
import { googlePlacesService } from '@/lib/external-apis/google-places-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      stores,
      city = 'Atlanta, GA'
    } = body

    console.log(`🔍 Store validation request:`, {
      storeCount: stores?.length || 0,
      city
    })

    if (!stores || !Array.isArray(stores)) {
      return NextResponse.json({
        error: 'Invalid stores array provided',
        details: 'stores must be an array of {storeName, address} objects'
      }, { status: 400 })
    }

    // Check if Google Places API is configured
    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!googleApiKey) {
      console.error('❌ Google Places API key not configured')
      return NextResponse.json({
        error: 'Store validation service not available',
        details: 'Google Places API not configured'
      }, { status: 500 })
    }

    console.log(`🔑 Google Places API Key status:`, {
      hasKey: !!googleApiKey,
      keyLength: googleApiKey?.length,
      keyPrefix: googleApiKey?.substring(0, 8) + '...'
    })

    try {
      // Validate all stores using Google Places
      const validationResults = await googlePlacesService.validateMultipleStores(
        stores.map((store: any) => ({
          storeName: store.storeName || store.name || 'Unknown Store',
          address: store.address || store.storeAddress || '',
          city
        }))
      )

      console.log(`✅ Validated ${validationResults.length} stores`)

      // Process results and add verification status
      const processedResults = validationResults.map((result, index) => ({
        originalStore: stores[index],
        validation: {
          storeName: result.storeName,
          originalAddress: result.originalAddress,
          isValid: result.isValid,
          correctedAddress: result.correctedAddress,
          verification: result.verification,
          placeId: result.placeId,
          phone: result.phone,
          website: result.website,
          rating: result.rating,
          // Add status indicator for UI
          status: result.verification === 'verified' ? 'verified' :
                  result.verification === 'corrected' ? 'corrected' :
                  'unverified'
        }
      }))

      // Calculate validation stats
      const stats = {
        total: validationResults.length,
        verified: validationResults.filter(r => r.verification === 'verified').length,
        corrected: validationResults.filter(r => r.verification === 'corrected').length,
        notFound: validationResults.filter(r => r.verification === 'not_found').length,
        successRate: Math.round((validationResults.filter(r => r.verification !== 'not_found').length / validationResults.length) * 100)
      }

      console.log(`📊 Validation stats:`, stats)

      return NextResponse.json({
        success: true,
        results: processedResults,
        stats,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'google-places-api',
          city: city
        }
      })

    } catch (validationError) {
      console.error('❌ Google Places validation error:', validationError)
      
      // Return fallback results when Google Places fails
      const fallbackResults = stores.map((store: any, index: number) => ({
        originalStore: store,
        validation: {
          storeName: store.storeName || store.name || 'Unknown Store',
          originalAddress: store.address || store.storeAddress || '',
          isValid: false,
          verification: 'not_found' as const,
          status: 'unverified' as const
        }
      }))

      return NextResponse.json({
        success: false,
        results: fallbackResults,
        error: 'Google Places validation failed',
        fallback: true,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'fallback',
          city: city
        }
      }, { status: 200 }) // Return 200 so the client can use fallback data
    }

  } catch (error) {
    console.error('❌ Store validation API error:', error)
    
    return NextResponse.json({
      error: 'Failed to validate stores',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const storeName = searchParams.get('storeName')
  const address = searchParams.get('address')
  const city = searchParams.get('city') || 'Milwaukee, WI'
  
  if (!storeName) {
    return NextResponse.json({
      error: 'Missing storeName parameter',
      usage: 'GET /api/stores/validate?storeName=Pick n Save&address=123 Main St&city=Milwaukee'
    }, { status: 400 })
  }
  
  // Convert GET to POST request for single store validation
  return POST(new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stores: [{
        storeName,
        address: address || '',
      }],
      city
    })
  }))
}