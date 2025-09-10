import { NextRequest, NextResponse } from 'next/server';
import { cleanMealPlannerService } from '@/lib/meal-planning/clean-meal-planner';

export async function POST(request: NextRequest) {
  try {
    console.log('🍽️ Clean meal plan generation requested');
    
    // Get user from session (with test mode support)
    const authHeader = request.headers.get('authorization');
    const isTestMode = authHeader === 'Bearer test-mode' || process.env.NODE_ENV === 'development';
    
    let user = null;
    
    if (!isTestMode) {
      if (!authHeader) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      // Add proper auth validation here if needed
      user = { id: 'authenticated-user' };
    } else {
      user = { id: 'test-user-id', email: 'test@example.com' };
    }
    
    const requestData = await request.json();
    console.log('📋 Clean meal plan request:', requestData);
    
    // Validate required fields
    const { weeklyBudget, numberOfMeals, culturalCuisines, householdSize } = requestData;
    
    if (!weeklyBudget || !numberOfMeals || !culturalCuisines || !householdSize) {
      return NextResponse.json({ 
        error: 'Missing required fields: weeklyBudget, numberOfMeals, culturalCuisines, householdSize' 
      }, { status: 400 });
    }
    
    // Generate meal plan using clean pipeline
    const mealPlan = await cleanMealPlannerService.generateMealPlan({
      weeklyBudget,
      numberOfMeals,
      culturalCuisines,
      householdSize,
      location: requestData.location || 'New York, NY',
      dietaryRestrictions: requestData.dietaryRestrictions || [],
      preferredStores: requestData.preferredStores || []
    });
    
    console.log('✅ Clean meal plan generated successfully:', {
      success: mealPlan.success,
      recipesCount: mealPlan.recipes.length,
      totalCost: mealPlan.totalCost,
      confidence: mealPlan.confidence
    });
    
    // Format response to match UI expectations
    const uiResponse = {
      mealPlan: {
        recipes: mealPlan.recipes,
        totalEstimatedCost: mealPlan.totalCost,
        confidence: mealPlan.confidence,
        budgetUtilization: mealPlan.budgetUtilization,
        costRange: {
          min: mealPlan.totalCost * 0.9,
          max: mealPlan.totalCost * 1.1
        }
      }
    };
    
    return NextResponse.json(uiResponse);
    
  } catch (error) {
    console.error('❌ Clean meal plan generation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      recipes: [],
      totalCost: 0,
      confidence: 'low'
    }, { status: 500 });
  }
}