import { NextRequest, NextResponse } from 'next/server';
import { PerplexityRecipeUrlService } from '@/lib/meal-planning/perplexity-recipe-urls';
import { PerplexityRecipeExtractor } from '@/lib/integrations/perplexity-recipe-extractor';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting full recipe generation test...');
    
    const urlService = new PerplexityRecipeUrlService();
    const extractor = new PerplexityRecipeExtractor();
    
    // Step 1: Get recipe URLs
    const urlRequest = {
      numberOfMeals: 2,
      culturalCuisines: ['Italian'],
      dietaryRestrictions: [],
      maxTime: undefined,
      exclude: []
    };
    
    console.log('📋 Step 1: Getting recipe URLs...');
    const urlResponse = await urlService.getRecipeUrls(urlRequest);
    
    if (!urlResponse.success || !urlResponse.recipes || urlResponse.recipes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No recipes returned from URL service',
        urlResponse
      });
    }
    
    console.log(`✅ Got ${urlResponse.recipes.length} URLs`);
    
    // Step 2: Extract first recipe as a test
    const firstRecipeInfo = urlResponse.recipes[0];
    console.log(`📋 Step 2: Extracting recipe from ${firstRecipeInfo.url}...`);
    
    if (!firstRecipeInfo.url || firstRecipeInfo.url === '') {
      return NextResponse.json({
        success: false,
        error: 'First recipe has no URL',
        recipeInfo: firstRecipeInfo
      });
    }
    
    const recipeData = await extractor.extractRecipe(firstRecipeInfo.url);
    
    return NextResponse.json({
      success: true,
      stage1: {
        recipeCount: urlResponse.recipes.length,
        firstRecipe: firstRecipeInfo
      },
      stage2: {
        extracted: !!recipeData,
        hasIngredients: recipeData ? recipeData.ingredients.length > 0 : false,
        recipe: recipeData
      }
    });

  } catch (error) {
    console.error('Full flow test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}