import { NextRequest, NextResponse } from 'next/server';
import { perplexityRecipeUrlService } from '@/lib/meal-planning/perplexity-recipe-urls';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing Stage 1 (Perplexity AI) only...');

    const body = await request.json();
    const {
      numberOfMeals = 2,
      culturalCuisines = ['Mexican'],
      dietaryRestrictions = [],
      householdSize = 4,
      maxTime = 45,
      pantry = [],
      exclude = []
    } = body;

    console.log('🔍 Stage 1 parameters:', {
      numberOfMeals,
      culturalCuisines,
      dietaryRestrictions,
      householdSize
    });

    const urlResponse = await perplexityRecipeUrlService.getRecipeUrls({
      numberOfMeals,
      culturalCuisines,
      dietaryRestrictions,
      maxTime,
      pantry,
      exclude
    });

    console.log('✅ Stage 1 completed:', {
      success: urlResponse.success,
      urlsFound: urlResponse.recipes.length,
      confidence: urlResponse.confidence,
      urls: urlResponse.recipes.map(r => r.url)
    });

    return NextResponse.json({
      success: urlResponse.success,
      stage: 'Stage 1 (Perplexity AI)',
      urlsFound: urlResponse.recipes.length,
      confidence: urlResponse.confidence,
      recipes: urlResponse.recipes,
      parameters: {
        numberOfMeals,
        culturalCuisines,
        dietaryRestrictions,
        householdSize
      }
    });

  } catch (error) {
    console.error('❌ Stage 1 test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        stage: 'Stage 1 (Perplexity AI)',
        error: 'Stage 1 test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Stage 1 (Perplexity AI) Test Endpoint',
    usage: 'POST with parameters to test recipe URL discovery',
    stage: 'Perplexity AI → Recipe URLs'
  });
}