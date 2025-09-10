import { NextRequest, NextResponse } from 'next/server';
import { PerplexityRecipeUrlService } from '@/lib/meal-planning/perplexity-recipe-urls';

export async function GET(request: NextRequest) {
  try {
    const urlService = new PerplexityRecipeUrlService();
    
    // Simple test request
    const urlRequest = {
      numberOfMeals: 2,
      culturalCuisines: ['Italian'],
      dietaryRestrictions: [],
      maxTime: undefined,
      exclude: []
    };
    
    console.log('🔍 Testing recipe URL generation...');
    const urlResponse = await urlService.getRecipeUrls(urlRequest);
    
    return NextResponse.json({
      success: urlResponse.success,
      recipeCount: urlResponse.recipes?.length || 0,
      recipes: urlResponse.recipes || [],
      confidence: urlResponse.confidence,
      raw: urlResponse
    });

  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}