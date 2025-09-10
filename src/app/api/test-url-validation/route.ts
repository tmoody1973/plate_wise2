import { NextRequest, NextResponse } from 'next/server';
import { perplexityRecipeUrlService } from '@/lib/meal-planning/perplexity-recipe-urls';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🧪 API: Testing URL validation with request:', body);
    
    const response = await perplexityRecipeUrlService.getRecipeUrls(body);
    
    console.log('✅ API: URL validation test completed:', {
      success: response.success,
      recipeCount: response.recipes.length,
      confidence: response.confidence
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ API: URL validation test failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        recipes: [],
        confidence: 'low'
      },
      { status: 500 }
    );
  }
}