import { NextRequest, NextResponse } from 'next/server';
import { buildMealPlanFromUrls } from '@/lib/meal-planning/meal-plan-adapter';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing clean meal plan with known URLs...');
    
    const { numberOfMeals = 2 } = await request.json();
    
    // Use known good recipe URLs (prioritize working ones)
    const testUrls = [
      "https://www.whats4eats.com/breads/okonomiyaki-recipe",
      "https://www.bonappetit.com/recipe/risotto-alla-milanese",
      "https://www.allrecipes.com/recipe/213742/cheesy-chicken-broccoli-casserole/"
    ];
    
    const urlsToUse = testUrls.slice(0, numberOfMeals);
    console.log('🔗 Using test URLs:', urlsToUse);
    
    // Generate meal plan using the working adapter
    const mealPlan = await buildMealPlanFromUrls(urlsToUse, numberOfMeals);
    
    console.log('✅ Clean meal plan test successful:', {
      mealsGenerated: mealPlan.meals.length,
      hasIngredients: mealPlan.meals.every(meal => meal.key_ingredients.length > 0),
      hasInstructions: mealPlan.meals.every(meal => meal.instructions.length > 0),
      hasTitles: mealPlan.meals.every(meal => meal.title && meal.title !== 'Untitled recipe')
    });
    
    // Convert to clean format
    const cleanRecipes = mealPlan.meals.map((item, index) => ({
      id: item.recipe_id,
      title: item.title,
      description: `Delicious ${item.culture_tags.join(', ')} recipe`,
      cuisine: item.culture_tags[0] || 'International',
      sourceUrl: item.source,
      imageUrl: item.imageUrl,
      totalTimeMinutes: item.time_minutes,
      servings: item.servings,
      ingredients: item.key_ingredients.map(ing => ({
        name: ing.display,
        estimatedCost: 3.0
      })),
      instructions: item.instructions.map(inst => ({
        step: inst.step,
        text: inst.text
      })),
      estimatedCost: item.key_ingredients.length * 3.0,
      costPerServing: (item.key_ingredients.length * 3.0) / item.servings
    }));
    
    return NextResponse.json({
      success: true,
      recipes: cleanRecipes,
      totalCost: cleanRecipes.reduce((sum, recipe) => sum + recipe.estimatedCost, 0),
      confidence: 'high',
      testInfo: {
        mealsGenerated: mealPlan.meals.length,
        hasIngredients: mealPlan.meals.every(meal => meal.key_ingredients.length > 0),
        hasInstructions: mealPlan.meals.every(meal => meal.instructions.length > 0),
        hasTitles: mealPlan.meals.every(meal => meal.title && meal.title !== 'Untitled recipe')
      }
    });
    
  } catch (error) {
    console.error('❌ Clean meal plan test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      recipes: [],
      totalCost: 0,
      confidence: 'low'
    }, { status: 500 });
  }
}