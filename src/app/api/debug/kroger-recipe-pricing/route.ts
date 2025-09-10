import { NextRequest, NextResponse } from 'next/server';
import { KrogerPricingService } from '@/lib/integrations/kroger-pricing';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ingredients, zipCode = '90210', servings = 4 } = body;

    if (!ingredients || !Array.isArray(ingredients)) {
      return NextResponse.json({
        success: false,
        error: 'ingredients array is required'
      }, { status: 400 });
    }

    console.log(`Testing Kroger recipe pricing for ${ingredients.length} ingredients in ${zipCode}`);

    const krogerService = new KrogerPricingService();
    
    // Calculate recipe cost with detailed breakdown
    const result = await krogerService.calculateRecipeCost(
      ingredients.map(ing => ({
        name: typeof ing === 'string' ? ing : ing.name,
        amount: typeof ing === 'object' ? ing.amount : 1,
        unit: typeof ing === 'object' ? ing.unit : 'each'
      })),
      zipCode
    );

    return NextResponse.json({
      success: true,
      zipCode,
      servings,
      totalIngredients: ingredients.length,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Kroger recipe pricing error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint for quick testing with sample recipes
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const recipeType = searchParams.get('recipe') || 'mexican';
  const zipCode = searchParams.get('zipCode') || '90210';

  // Sample recipes for testing
  const sampleRecipes = {
    mexican: [
      { name: 'ground beef', amount: 1, unit: 'lb' },
      { name: 'onions', amount: 1, unit: 'medium' },
      { name: 'tomatoes', amount: 2, unit: 'large' },
      { name: 'bell peppers', amount: 1, unit: 'each' },
      { name: 'garlic', amount: 3, unit: 'cloves' },
      { name: 'cumin', amount: 1, unit: 'tsp' },
      { name: 'chili powder', amount: 1, unit: 'tbsp' },
      { name: 'rice', amount: 1, unit: 'cup' },
      { name: 'black beans', amount: 1, unit: 'can' },
      { name: 'cheese', amount: 8, unit: 'oz' }
    ],
    italian: [
      { name: 'pasta', amount: 1, unit: 'lb' },
      { name: 'ground turkey', amount: 1, unit: 'lb' },
      { name: 'marinara sauce', amount: 1, unit: 'jar' },
      { name: 'mozzarella cheese', amount: 8, unit: 'oz' },
      { name: 'parmesan cheese', amount: 4, unit: 'oz' },
      { name: 'garlic', amount: 4, unit: 'cloves' },
      { name: 'basil', amount: 2, unit: 'tbsp' },
      { name: 'olive oil', amount: 2, unit: 'tbsp' }
    ],
    asian: [
      { name: 'chicken breast', amount: 1, unit: 'lb' },
      { name: 'soy sauce', amount: 3, unit: 'tbsp' },
      { name: 'ginger', amount: 1, unit: 'inch' },
      { name: 'garlic', amount: 3, unit: 'cloves' },
      { name: 'rice', amount: 1, unit: 'cup' },
      { name: 'broccoli', amount: 1, unit: 'head' },
      { name: 'carrots', amount: 2, unit: 'large' },
      { name: 'sesame oil', amount: 1, unit: 'tbsp' },
      { name: 'green onions', amount: 3, unit: 'stalks' }
    ]
  };

  const ingredients = sampleRecipes[recipeType as keyof typeof sampleRecipes] || sampleRecipes.mexican;

  // Forward to POST endpoint
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ ingredients, zipCode, servings: 4 })
  }));
}