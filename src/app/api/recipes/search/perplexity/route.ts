import { NextRequest, NextResponse } from 'next/server'
import { perplexityRecipeSearchService } from '@/lib/external-apis/perplexity-recipe-search'

export async function GET(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
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

    console.log('🔍 Perplexity recipe search request:', {
      query,
      country,
      includeIngredients,
      excludeIngredients,
      maxResults,
      culturalCuisine,
      dietaryRestrictions,
      difficulty
    })

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
      console.error('❌ Perplexity recipe search failed:', result.error)
      return NextResponse.json(
        { error: result.error || 'Recipe search failed' },
        { status: 500 }
      )
    }

    console.log('✅ Found', result.recipes.length, 'recipes via Perplexity')

    // Transform to match the existing API format for compatibility
    const transformedResponse = {
      recipes: result.recipes.map(recipe => ({
        title: recipe.title,
        description: recipe.description,
        cultural_origin: recipe.culturalOrigin,
        cuisine: recipe.cuisine,
        ingredients: recipe.ingredients.map(ing => ({
          // Use the new consistent format that works with pricing API
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
          calories: recipe.nutritionalInfo.calories,
          protein_g: recipe.nutritionalInfo.protein_g,
          fat_g: recipe.nutritionalInfo.fat_g,
          carbs_g: recipe.nutritionalInfo.carbs_g
        } : null,
        cost_analysis: null, // Will be populated by pricing API
        metadata: {
          source_url: recipe.metadata.sourceUrl,
          image_url: null, // Could be enhanced later
          servings: recipe.metadata.servings,
          total_time_minutes: recipe.metadata.totalTimeMinutes,
          difficulty: recipe.metadata.difficulty
        },
        tags: recipe.tags,
        source: 'perplexity',
        is_public: true
      })),
      meta: {
        has_more: false,
        sources: result.sources
          .filter(url => {
            try {
              new URL(url);
              return true;
            } catch {
              return false;
            }
          })
          .map(url => ({ url, title: '' })),
        used_filters: {
          query,
          country,
          includeIngredients: includeIngredients || [],
          excludeIngredients: excludeIngredients || [],
          maxResults
        }
      }
    }

    return NextResponse.json(transformedResponse)

  } catch (error) {
    console.error('Recipe search API error:', error)
    return NextResponse.json(
      { error: 'Failed to search recipes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request) // Support both GET and POST for flexibility
}