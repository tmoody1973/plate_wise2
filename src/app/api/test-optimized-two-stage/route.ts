import { NextRequest, NextResponse } from 'next/server';
import { OptimizedTwoStageSearch } from '@/lib/meal-planning/optimized-two-stage-search';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { query = 'Mexican tacos', maxResults = 3, culturalCuisine, dietaryRestrictions } = body;

    console.log('🚀 Testing optimized two-stage search...');
    console.log('Request:', { query, maxResults, culturalCuisine, dietaryRestrictions });

    const searchService = new OptimizedTwoStageSearch();
    
    const result = await searchService.searchRecipes({
      query,
      maxResults,
      culturalCuisine,
      dietaryRestrictions,
      maxTimeMinutes: 30
    }, {
      maxConcurrent: 2,
      tavilyTimeoutMs: 5000,
      perplexityTimeoutMs: 10000,
      maxRetries: 1
    });

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Optimized two-stage search completed',
      totalTime,
      result: {
        ...result,
        recipes: result.recipes.map(recipe => ({
          title: recipe.title,
          description: recipe.description,
          cuisine: recipe.cuisine,
          sourceUrl: recipe.sourceUrl,
          totalTimeMinutes: recipe.totalTimeMinutes,
          servings: recipe.servings,
          ingredientCount: recipe.ingredients.length,
          instructionCount: recipe.instructions.length
        }))
      },
      performance: {
        totalTime,
        stage1Time: result.stage1Time,
        stage2Time: result.stage2Time,
        stage1Percentage: Math.round((result.stage1Time / totalTime) * 100),
        stage2Percentage: Math.round((result.stage2Time / totalTime) * 100)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ Optimized two-stage search failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      totalTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}