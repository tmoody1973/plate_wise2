import { NextRequest, NextResponse } from 'next/server';
import { perplexityMealPlannerService } from '@/lib/meal-planning/perplexity-meal-planner';

export async function GET() {
  try {
    console.log('🔍 Debug: Testing meal planner service...');
    
    // Test if the service is properly instantiated
    console.log('Service type:', typeof perplexityMealPlannerService);
    console.log('Service methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(perplexityMealPlannerService)));
    
    // Test a simple method call
    const testRequest = {
      weeklyBudget: 50,
      numberOfMeals: 2,
      culturalCuisines: ['Korean'],
      dietaryRestrictions: [],
      householdSize: 2,
      pantryItems: [],
      preferredStores: [],
      location: 'Test Location'
    };

    console.log('🧪 Testing generateMealPlan method...');
    const result = await perplexityMealPlannerService.generateMealPlan(testRequest);
    
    return NextResponse.json({
      success: true,
      message: 'Meal planner service is working correctly',
      serviceType: typeof perplexityMealPlannerService,
      resultType: typeof result,
      recipeCount: result.recipes?.length || 0
    });

  } catch (error) {
    console.error('❌ Debug meal planner error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      serviceType: typeof perplexityMealPlannerService
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔍 Debug: Testing meal planner with custom request...');
    console.log('Request body:', body);
    
    const result = await perplexityMealPlannerService.generateMealPlan(body);
    
    return NextResponse.json({
      success: true,
      message: 'Custom meal plan generated successfully',
      result
    });

  } catch (error) {
    console.error('❌ Debug custom meal planner error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}