import { NextRequest, NextResponse } from 'next/server';
import { krogerPricingService } from '@/lib/integrations/kroger-pricing';

export async function POST(request: NextRequest) {
  try {
    const { ingredient, ingredients, recipe, zipCode } = await request.json();
    
    console.log('🧪 Testing Kroger API pricing integration...');

    let results;
    const startTime = Date.now();

    if (recipe) {
      // Test full recipe cost calculation
      results = await krogerPricingService.calculateRecipeCost(recipe.ingredients, zipCode);
    } else if (ingredients && Array.isArray(ingredients)) {
      // Test multiple ingredients
      const pricingResults = await krogerPricingService.getMultipleIngredientPrices(ingredients, zipCode);
      results = Array.from(pricingResults.entries()).map(([ingredient, pricing]) => ({
        ingredient,
        ...pricing
      }));
    } else if (ingredient) {
      // Test single ingredient
      const pricing = await krogerPricingService.getIngredientPrice(ingredient, zipCode);
      results = [{ ingredient, ...pricing }];
    } else {
      return NextResponse.json({ error: 'Provide ingredient, ingredients array, or recipe object' }, { status: 400 });
    }

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      totalTimeMs: totalTime,
      results,
      apiProvider: 'Kroger',
      summary: recipe ? {
        totalCost: results.totalCost,
        costPerServing: results.costPerServing,
        ingredientCount: results.ingredientCosts.length,
        highConfidenceItems: results.ingredientCosts.filter((item: any) => item.confidence === 'high').length,
        budgetTips: results.savings?.budgetOptimizationTips.length || 0,
        krogerLocation: results.ingredientCosts[0]?.krogerLocation
      } : {
        totalIngredients: Array.isArray(results) ? results.length : 1,
        withPricing: Array.isArray(results) ? results.filter(r => r.bestMatch).length : (results.bestMatch ? 1 : 0),
        avgConfidence: Array.isArray(results) ? 
          results.reduce((sum, r) => sum + (r.confidence === 'high' ? 3 : r.confidence === 'medium' ? 2 : 1), 0) / results.length :
          (results.confidence === 'high' ? 3 : results.confidence === 'medium' ? 2 : 1),
        krogerLocation: Array.isArray(results) ? results[0]?.location?.name : results.location?.name
      }
    });

  } catch (error) {
    console.error('❌ Kroger pricing test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Kroger pricing test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        apiProvider: 'Kroger'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Kroger API Pricing Test Endpoint',
    usage: {
      singleIngredient: 'POST with { "ingredient": "tomatoes", "zipCode": "45202" }',
      multipleIngredients: 'POST with { "ingredients": ["tomatoes", "onions"], "zipCode": "45202" }',
      fullRecipe: 'POST with { "recipe": { "ingredients": [{"name": "tomatoes", "amount": 2}] }, "zipCode": "45202" }',
      locations: 'Zip code determines which Kroger store to use for pricing'
    },
    features: ['Real Kroger pricing', 'Store locations', 'Sale prices', 'Budget optimization', 'Cost per serving'],
    apiProvider: 'Kroger'
  });
}