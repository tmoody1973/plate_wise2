import { NextRequest, NextResponse } from 'next/server';
import { perplexityTwoStageSearchService } from '@/lib/meal-planning/perplexity-two-stage-search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { culturalCuisines, dietaryRestrictions, maxResults = 3 } = body;

    console.log('🧪 Testing Perplexity Two-Stage Search...');
    console.log('Request:', { culturalCuisines, dietaryRestrictions, maxResults });

    const searchRequest = {
      query: `${culturalCuisines?.[0] || 'international'} recipes`,
      culturalCuisine: culturalCuisines?.[0],
      dietaryRestrictions: dietaryRestrictions || [],
      maxResults: Math.min(maxResults, 3)
    };

    const result = await perplexityTwoStageSearchService.searchRecipes(searchRequest);

    console.log('✅ Two-stage search completed successfully');
    console.log(`Found ${result.recipes.length} recipes`);

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Two-stage search failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}