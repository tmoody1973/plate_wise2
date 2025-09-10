import { NextRequest, NextResponse } from 'next/server';
import { perplexityMealPlannerService } from '@/lib/meal-planning/perplexity-meal-planner';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🧪 Testing meal plan generation:', body);

    // Test meal plan generation without authentication
    const mealPlan = await perplexityMealPlannerService.generateMealPlan({
      weeklyBudget: body.weeklyBudget || 100,
      numberOfMeals: body.numberOfMeals || 2,
      culturalCuisines: body.culturalCuisines || ['Italian'],
      dietaryRestrictions: body.dietaryRestrictions || [],
      householdSize: body.householdSize || 4,
      pantryItems: body.pantryItems || [],
      preferredStores: body.preferredStores || [],
      location: body.location || 'United States'
    });

    console.log('✅ Meal plan test successful:', {
      recipesFound: mealPlan.recipes.length,
      firstRecipeTitle: mealPlan.recipes[0]?.title,
      firstRecipeSource: mealPlan.recipes[0]?.sourceUrl
    });

    return NextResponse.json({
      success: true,
      mealPlan: {
        recipes: mealPlan.recipes.map(recipe => ({
          title: recipe.title,
          sourceUrl: recipe.sourceUrl,
          imageUrl: recipe.imageUrl,
          cuisine: recipe.cuisine,
          culturalOrigin: recipe.culturalOrigin,
          totalIngredients: recipe.ingredients.length,
          totalInstructions: recipe.instructions.length
        })),
        totalCost: mealPlan.totalEstimatedCost,
        confidence: mealPlan.confidence
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Meal plan test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Meal Plan Generation Test Endpoint',
    description: 'Test meal plan generation without authentication',
    usage: {
      'POST /api/debug/meal-plan-test': {
        body: {
          weeklyBudget: 'number (optional) - defaults to 100',
          numberOfMeals: 'number (optional) - defaults to 2',
          culturalCuisines: 'string[] (optional) - defaults to ["Italian"]',
          householdSize: 'number (optional) - defaults to 4'
        }
      }
    }
  });
}