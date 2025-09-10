import { NextRequest, NextResponse } from 'next/server';
import { PerplexityRecipeExtractor } from '@/lib/integrations/perplexity-recipe-extractor';

export async function GET(request: NextRequest) {
  try {
    const extractor = new PerplexityRecipeExtractor();
    
    // Test with a known good URL
    const testUrl = 'https://www.allrecipes.com/recipe/8309691/italian-sunday-sauce/';
    
    console.log('🔍 Testing recipe extraction from:', testUrl);
    const recipeData = await extractor.extractRecipe(testUrl);
    
    return NextResponse.json({
      success: !!recipeData,
      url: testUrl,
      recipe: recipeData || null,
      hasIngredients: recipeData ? recipeData.ingredients.length > 0 : false
    });

  } catch (error) {
    console.error('Extraction test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}