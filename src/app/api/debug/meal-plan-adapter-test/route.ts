import { NextRequest, NextResponse } from 'next/server';
import { generateMealPlanFromQuery, buildMealPlanFromUrls } from '@/lib/meal-planning/meal-plan-adapter';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing meal plan adapter...');
    
    const { query, culturalCuisine, numberOfMeals, urls } = await request.json();
    
    let mealPlan;
    
    if (urls && Array.isArray(urls)) {
      // Test with provided URLs
      console.log('🔗 Testing with provided URLs:', urls);
      mealPlan = await buildMealPlanFromUrls(urls, numberOfMeals || urls.length);
    } else {
      // Test with query-based generation
      console.log('🔍 Testing with query:', { query, culturalCuisine, numberOfMeals });
      mealPlan = await generateMealPlanFromQuery(
        query || 'Italian pasta recipe',
        culturalCuisine || 'Italian',
        numberOfMeals || 2
      );
    }
    
    console.log('✅ Meal plan adapter test successful:', {
      mealsGenerated: mealPlan.meals.length,
      firstMealTitle: mealPlan.meals[0]?.title,
      firstMealIngredients: mealPlan.meals[0]?.key_ingredients.length,
      firstMealInstructions: mealPlan.meals[0]?.instructions.length
    });
    
    return NextResponse.json({
      success: true,
      mealPlan,
      testInfo: {
        mealsGenerated: mealPlan.meals.length,
        hasIngredients: mealPlan.meals.every(meal => meal.key_ingredients.length > 0),
        hasInstructions: mealPlan.meals.every(meal => meal.instructions.length > 0),
        hasTitles: mealPlan.meals.every(meal => meal.title && meal.title !== 'Untitled recipe')
      }
    });
    
  } catch (error) {
    console.error('❌ Meal plan adapter test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}