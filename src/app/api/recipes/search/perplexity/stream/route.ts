import { NextRequest } from 'next/server'
import { perplexityRecipeSearchService } from '@/lib/external-apis/perplexity-recipe-search'

// Streaming endpoint configuration
export const maxDuration = 30;
export const runtime = 'edge';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query') || ''
  const country = searchParams.get('country') || 'United States'
  const includeCSV = searchParams.get('include') || ''
  const excludeCSV = searchParams.get('exclude') || ''
  const maxResults = searchParams.get('max') ? Number(searchParams.get('max')) : 3
  const culturalCuisine = searchParams.get('cuisine') || ''
  const dietaryCSV = searchParams.get('dietary') || ''
  const difficulty = searchParams.get('difficulty') as 'easy' | 'medium' | 'hard' | null

  if (!query.trim()) {
    return new Response(
      JSON.stringify({ type: 'error', error: 'Query parameter is required' }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  const includeIngredients = includeCSV
    ? includeCSV.split(',').map(s => s.trim()).filter(Boolean)
    : undefined

  const excludeIngredients = excludeCSV
    ? excludeCSV.split(',').map(s => s.trim()).filter(Boolean)
    : undefined

  const dietaryRestrictions = dietaryCSV
    ? dietaryCSV.split(',').map(s => s.trim()).filter(Boolean)
    : undefined

  console.log('🔍 Perplexity streaming recipe search request:', {
    query,
    country,
    includeIngredients,
    excludeIngredients,
    maxResults,
    culturalCuisine,
    dietaryRestrictions,
    difficulty
  })

  // Create a readable stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const startTime = Date.now()
        
        for await (const chunk of perplexityRecipeSearchService.searchRecipesStream({
          query,
          country,
          includeIngredients,
          excludeIngredients,
          maxResults,
          culturalCuisine: culturalCuisine || undefined,
          dietaryRestrictions,
          difficulty: difficulty || undefined
        })) {
          // Send each chunk as Server-Sent Events
          const data = `data: ${JSON.stringify(chunk)}\n\n`
          controller.enqueue(encoder.encode(data))
          
          if (chunk.type === 'complete') {
            const duration = Date.now() - startTime
            console.log('✅ Streaming search completed in', duration + 'ms')
            
            // Send completion event
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            break
          }
          
          if (chunk.type === 'error') {
            console.error('❌ Streaming search error:', chunk.error)
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            break
          }
        }
        
        controller.close()
      } catch (error) {
        console.error('Streaming controller error:', error)
        const errorChunk = {
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown streaming error'
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}

export async function POST(request: NextRequest) {
  return GET(request) // Support both GET and POST for flexibility
}