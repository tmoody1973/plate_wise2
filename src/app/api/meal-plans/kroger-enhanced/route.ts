import { NextRequest, NextResponse } from 'next/server';
import { KrogerEnhancedMealPlanner } from '@/lib/meal-planning/kroger-enhanced-meal-planner';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      culturalCuisines = ['mexican'],
      dietaryRestrictions = [],
      budgetLimit = 50,
      householdSize = 4,
      timeFrame = 'week',
      zipCode = '90210',
      nutritionalGoals = [],
      excludeIngredients = [],
      preferredStores = ['kroger']
    } = body;

    console.log('🍽️ Generating Kroger-enhanced meal plan...');
    console.log('Request:', {
      culturalCuisines,
      budgetLimit,
      householdSize,
      zipCode
    });

    const mealPlanner = new KrogerEnhancedMealPlanner();
    
    const mealPlan = await mealPlanner.generateMealPlan({
      culturalCuisines,
      dietaryRestrictions,
      budgetLimit,
      householdSize,
      timeFrame,
      zipCode,
      nutritionalGoals,
      excludeIngredients,
      preferredStores
    });

    return NextResponse.json({
      success: true,
      message: 'Enhanced meal plan generated successfully',
      data: {
        mealPlan: {
          ...mealPlan,
          shoppingList: {
            byStore: Object.fromEntries(mealPlan.shoppingList.byStore),
            totalEstimatedCost: mealPlan.shoppingList.totalEstimatedCost
          }
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Enhanced meal plan generation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint for quick testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cuisine = searchParams.get('cuisine') || 'mexican';
  const budget = parseFloat(searchParams.get('budget') || '50');
  const people = parseInt(searchParams.get('people') || '4');
  const zipCode = searchParams.get('zipCode') || '90210';

  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({
      culturalCuisines: [cuisine],
      budgetLimit: budget,
      householdSize: people,
      zipCode
    })
  }));
}