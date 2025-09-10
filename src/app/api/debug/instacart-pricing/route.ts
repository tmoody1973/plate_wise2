import { NextRequest, NextResponse } from 'next/server';
import { instacartPricingService } from '@/lib/integrations/instacart-pricing';

export async function POST(request: NextRequest) {
  try {
    const { ingredient, ingredients, recipe, zipCode } = await request.json();
    
    console.log('🧪 Testing Instacart pricing integration...');

    let results;
    const startTime = Date.now();

    if (recipe) {
      // Test full recipe cost calculation
      results = await instacartPricingService.calculateRecipeCost(recipe.ingredients, zipCode);
    } else if (ingredients && Array.isArray(ingredients)) {
      // Test multiple ingredients
      const pricingResults = await instacartPricingService.getMultipleIngredientPrices(ingredients, zipCode);
      results = Array.from(pricingResults.entries()).map(([ingredient, pricing]) => ({
        ingredient,
        ...pricing
      }));
    } else if (ingredient) {
      // Test single ingredient
      const pricing = await instacartPricingService.getIngredientPrice(ingredient, zipCode);
      results = [{ ingredient, ...pricing }];
    } else {
      return NextResponse.json({ error: 'Provide ingredient, ingredients array, or recipe object' }, { status: 400 });
    }

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      totalTimeMs: totalTime,
      results,
      summary: recipe ? {
        totalCost: results.totalCost,
        costPerServing: results.costPerServing,
        ingredientCount: results.ingredientCosts.length,
        highConfidenceItems: results.ingredientCosts.filter((item: any) => item.confidence === 'high').length,
        budgetTips: results.savings?.budgetOptimizationTips.length || 0
      } : {
        totalIngredients: Array.isArray(results) ? results.length : 1,
        withPricing: Array.isArray(results) ? results.filter(r => r.bestMatch).length : (results.bestMatch ? 1 : 0),
        avgConfidence: Array.isArray(results) ? 
          results.reduce((sum, r) => sum + (r.confidence === 'high' ? 3 : r.confidence === 'medium' ? 2 : 1), 0) / results.length :
          (results.confidence === 'high' ? 3 : results.confidence === 'medium' ? 2 : 1)
      }
    });

  } catch (error) {
    console.error('❌ Instacart pricing test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Instacart pricing test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Instacart Pricing Test Endpoint',
    usage: {
      singleIngredient: 'POST with { "ingredient": "tomatoes" }',
      multipleIngredients: 'POST with { "ingredients": ["tomatoes", "onions"] }',
      fullRecipe: 'POST with { "recipe": { "ingredients": [{"name": "tomatoes", "amount": 2}] } }',
      withLocation: 'Add "zipCode": "12345" to any request'
    },
    features: ['Real Instacart pricing', 'Budget optimization', 'Alternative suggestions', 'Cost per serving']
  });
}