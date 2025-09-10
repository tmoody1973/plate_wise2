import { NextRequest, NextResponse } from 'next/server';
import { perplexityMealPlannerService } from '@/lib/meal-planning/perplexity-meal-planner';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      culturalCuisines = ['mediterranean'],
      dietaryRestrictions = [],
      budgetLimit = 50,
      householdSize = 4,
      numberOfMeals = 3
    } = body;

    console.log('🧪 Testing Perplexity meal planner service...');
    console.log('Request:', { culturalCuisines, dietaryRestrictions, budgetLimit, householdSize, numberOfMeals });

    const mealPlanRequest = {
      culturalCuisines: culturalCuisines || ['international'],
      dietaryRestrictions: dietaryRestrictions || [],
      weeklyBudget: budgetLimit,
      householdSize,
      numberOfMeals,
      pantryItems: [],
      location: undefined
    };

    console.log('Calling perplexityMealPlannerService.generateMealPlan...');
    
    const startTime = Date.now();
    const result = await perplexityMealPlannerService.generateMealPlan(mealPlanRequest);
    const endTime = Date.now();

    console.log('✅ Perplexity meal planner completed in', endTime - startTime, 'ms');
    console.log('Result type:', typeof result);
    console.log('Result keys:', Object.keys(result || {}));
    console.log('Recipes count:', result?.recipes?.length || 0);

    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'Perplexity meal planner returned null/undefined'
      });
    }

    if (!result.recipes) {
      return NextResponse.json({
        success: false,
        error: 'Perplexity meal planner returned result without recipes',
        result: result
      });
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${result.recipes.length} recipes successfully`,
      data: {
        recipeCount: result.recipes.length,
        totalCost: result.totalEstimatedCost,
        budgetUtilization: result.budgetUtilization,
        confidence: result.confidence,
        recipes: result.recipes.map(recipe => ({
          id: recipe.id,
          title: recipe.title,
          cuisine: recipe.cuisine,
          ingredientCount: recipe.ingredients?.length || 0,
          instructionCount: recipe.instructions?.length || 0
        }))
      },
      executionTime: endTime - startTime
    });

  } catch (error) {
    console.error('❌ Perplexity meal planner test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name || 'Unknown'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint with meal plan parameters to test Perplexity service',
    example: {
      culturalCuisines: ['mediterranean'],
      dietaryRestrictions: [],
      budgetLimit: 50,
      householdSize: 4,
      numberOfMeals: 3
    }
  });
}