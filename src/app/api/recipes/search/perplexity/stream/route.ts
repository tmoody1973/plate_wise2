import { NextRequest } from 'next/server'
import { perplexityRecipeSearchService } from '@/lib/external-apis/perplexity-recipe-search'

// Increase timeout for this specific API route
export const maxDuration = 60;
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
      JSON.stringify({ error: 'Query parameter is required' }), 
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

  console.log('🔍 Perplexity streaming recipe search:', { query, maxResults })

  // Create readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      
      const sendEvent = (type: string, data: any) => {
        const message = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      try {
        // Send initial status
        sendEvent('status', { message: 'Starting recipe search...', progress: 0 })

        // Call the original service but we'll process results one by one
        const result = await perplexityRecipeSearchService.searchRecipes({
          query,
          country,
          includeIngredients,
          excludeIngredients,
          maxResults,
          culturalCuisine: culturalCuisine || undefined,
          dietaryRestrictions,
          difficulty: difficulty || undefined
        })

        if (!result.success) {
          sendEvent('error', { error: result.error || 'Recipe search failed' })
          controller.close()
          return
        }

        // Send total count
        sendEvent('meta', {
          totalRecipes: result.recipes.length,
          sources: result.sources.map(url => ({ url, title: '' }))
        })

        // Stream each recipe individually with a small delay to simulate processing
        for (let i = 0; i < result.recipes.length; i++) {
          const recipe = result.recipes[i]
          
          // Send processing status
          sendEvent('status', { 
            message: `Processing recipe ${i + 1} of ${result.recipes.length}...`, 
            progress: ((i + 1) / result.recipes.length) * 100 
          })

          // Add small delay to make streaming visible
          await new Promise(resolve => setTimeout(resolve, 500))

          // Transform and send recipe
          const transformedRecipe = {
            title: recipe.title,
            description: recipe.description,
            cultural_origin: recipe.culturalOrigin,
            cuisine: recipe.cuisine,
            ingredients: recipe.ingredients.map(ing => ({
              name: ing.name,
              amount: ing.amount,
              unit: ing.unit,
              notes: ing.notes
            })),
            instructions: recipe.instructions.map(inst => ({
              step: inst.step,
              text: inst.text
            })),
            nutritional_info: recipe.nutritionalInfo ? {
              calories: recipe.nutritionalInfo.calories || 0,
              protein_g: recipe.nutritionalInfo.protein_g || 0,
              fat_g: recipe.nutritionalInfo.fat_g || 0,
              carbs_g: recipe.nutritionalInfo.carbs_g || 0
            } : null,
            cost_analysis: null,
            metadata: {
              source_url: recipe.metadata.sourceUrl,
              image_url: recipe.metadata.imageUrl || null,
              servings: recipe.metadata.servings,
              total_time_minutes: recipe.metadata.totalTimeMinutes,
              difficulty: recipe.metadata.difficulty
            },
            tags: recipe.tags,
            source: 'perplexity',
            is_public: true
          }

          sendEvent('recipe', { recipe: transformedRecipe, index: i })
        }

        // Send completion
        sendEvent('complete', { 
          message: `Found ${result.recipes.length} recipes!`,
          totalRecipes: result.recipes.length
        })

        controller.close()

      } catch (error) {
        console.error('Streaming recipe search error:', error)
        sendEvent('error', { error: 'Failed to search recipes' })
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
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}

export async function POST(request: NextRequest) {
  return GET(request) // Support both GET and POST for flexibility
}