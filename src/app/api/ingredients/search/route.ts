import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      ingredient,
      store,
      location = '30309',
      searchType = 'alternatives' // 'alternatives', 'substitutes', 'availability'
    } = body

    console.log(`🔍 Ingredient search request:`, {
      ingredient,
      store,
      location,
      searchType
    })

    if (!ingredient || typeof ingredient !== 'string') {
      return NextResponse.json({
        error: 'Invalid ingredient provided',
        details: 'Ingredient must be a non-empty string'
      }, { status: 400 })
    }

    // Validate Perplexity API key
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY
    if (!perplexityApiKey) {
      console.error('❌ Perplexity API key not configured')
      return NextResponse.json({
        error: 'Ingredient search service not available',
        details: 'API configuration missing'
      }, { status: 500 })
    }

    console.log(`🔑 Perplexity API Key status:`, {
      hasKey: !!perplexityApiKey,
      keyLength: perplexityApiKey?.length,
      keyPrefix: perplexityApiKey?.substring(0, 8) + '...'
    })

    // Build search prompt based on search type
    let searchPrompt = ''
    
    switch (searchType) {
      case 'alternatives':
        searchPrompt = store 
          ? `Find ingredient alternatives for "${ingredient}" available at ${store} in Atlanta, Georgia (${location}). Include pricing, package sizes, and product names. If ${store} doesn't carry good alternatives, suggest other Atlanta stores that do.`
          : `Find ingredient alternatives and substitutes for "${ingredient}" available at Atlanta stores (zip code ${location}). Include store names, pricing, package sizes, and product names for each alternative.`
        break
        
      case 'substitutes':
        searchPrompt = `What are good cooking substitutes for "${ingredient}"? Include ratios and any preparation differences. Then find these substitutes at Atlanta grocery stores (${location}) with current pricing.`
        break
        
      case 'availability':
        searchPrompt = store
          ? `Check if ${store} in Atlanta (${location}) carries "${ingredient}". If yes, provide current pricing and product details. If no, suggest the closest Atlanta stores that do carry it.`
          : `Find which Atlanta grocery stores (${location}) carry "${ingredient}" and provide current pricing, package sizes, and store addresses.`
        break
        
      default:
        searchPrompt = `Find alternatives and pricing for "${ingredient}" at Atlanta grocery stores (${location}).`
    }

    console.log(`📝 Search prompt:`, searchPrompt.substring(0, 200) + '...')

    // Make Perplexity API request
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a grocery shopping expert. Provide accurate, current pricing information for ingredients and alternatives. Always include store names, product names, package sizes, prices, and store addresses when available. Format responses as structured data when possible.'
          },
          {
            role: 'user',
            content: searchPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    })

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text()
      console.error('❌ Perplexity API error:', perplexityResponse.status, errorText)
      return NextResponse.json({
        error: 'Ingredient search failed',
        details: `API returned ${perplexityResponse.status}`
      }, { status: 500 })
    }

    const perplexityData = await perplexityResponse.json()
    console.log(`✅ Perplexity API response received, length:`, perplexityData.choices?.[0]?.message?.content?.length || 0)
    
    const searchResults = perplexityData.choices?.[0]?.message?.content || ''

    // Try to extract structured data if possible
    let structuredResults = null
    try {
      // Look for JSON-like structures in the response
      const jsonMatch = searchResults.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        structuredResults = JSON.parse(jsonMatch[0])
        console.log(`📊 Extracted structured results:`, structuredResults.length, 'items')
      }
    } catch (e) {
      console.log(`📝 Response is unstructured text, keeping as-is`)
    }

    return NextResponse.json({
      success: true,
      query: {
        ingredient,
        store,
        location,
        searchType
      },
      results: {
        structured: structuredResults,
        text: searchResults,
        hasStructuredData: !!structuredResults
      },
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'perplexity-ai',
        prompt: searchPrompt
      }
    })

  } catch (error) {
    console.error('❌ Ingredient search error:', error)
    
    return NextResponse.json({
      error: 'Failed to search for ingredient',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const ingredient = searchParams.get('ingredient')
  const store = searchParams.get('store')
  const location = searchParams.get('location') || '53206'
  
  if (!ingredient) {
    return NextResponse.json({
      error: 'Missing ingredient parameter',
      usage: 'GET /api/ingredients/search?ingredient=flour&store=Pick n Save&location=53206'
    }, { status: 400 })
  }
  
  // Convert GET to POST request
  return POST(new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ingredient,
      store,
      location,
      searchType: 'alternatives'
    })
  }))
}