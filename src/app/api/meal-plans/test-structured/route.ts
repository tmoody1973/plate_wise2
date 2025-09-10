import { NextRequest, NextResponse } from 'next/server';
import { perplexityMealPlannerService } from '@/lib/meal-planning/perplexity-meal-planner';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing structured Perplexity meal plan generation...');

    // Test request with diverse cultural cuisines and store preferences
    const testRequest = {
      weeklyBudget: 75,
      numberOfMeals: 3,
      culturalCuisines: ['Korean', 'Mexican', 'West African'],
      dietaryRestrictions: ['halal_friendly'],
      householdSize: 2,
      pantryItems: ['rice', 'onions', 'garlic', 'olive oil'],
      preferredStores: [
        {
          name: 'H-Mart',
          type: 'Asian Grocery',
          address: '123 Main St',
          specialties: ['Korean ingredients', 'Asian produce', 'kimchi'],
          placeId: 'test-hmart'
        },
        {
          name: 'Mercado Latino',
          type: 'Latin Market',
          address: '456 Oak Ave',
          specialties: ['Mexican spices', 'fresh tortillas', 'Latin produce'],
          placeId: 'test-mercado'
        },
        {
          name: 'African Market',
          type: 'Specialty Grocery',
          address: '789 Pine St',
          specialties: ['West African ingredients', 'plantains', 'palm oil'],
          placeId: 'test-african'
        }
      ],
      location: 'San Francisco, CA'
    };

    console.log('📋 Test request:', JSON.stringify(testRequest, null, 2));

    // Generate meal plan using structured approach
    const startTime = Date.now();
    const mealPlan = await perplexityMealPlannerService.generateMealPlan(testRequest);
    const duration = Date.now() - startTime;

    console.log('✅ Structured meal plan generated successfully!');
    console.log(`⏱️ Generation time: ${duration}ms`);
    console.log('📊 Results summary:', {
      recipeCount: mealPlan.recipes.length,
      totalCost: mealPlan.totalEstimatedCost,
      budgetUtilization: `${mealPlan.budgetUtilization.toFixed(1)}%`,
      culturalBalance: mealPlan.culturalBalance,
      confidence: mealPlan.confidence
    });

    // Log detailed recipe information
    mealPlan.recipes.forEach((recipe, index) => {
      console.log(`\n🍽️ Recipe ${index + 1}: ${recipe.title}`);
      console.log(`   Culture: ${recipe.culturalOrigin.join(', ')}`);
      console.log(`   Cost: $${recipe.metadata.estimatedCost.toFixed(2)} (${recipe.metadata.servings} servings)`);
      console.log(`   Time: ${recipe.metadata.totalTimeMinutes} minutes`);
      console.log(`   Authenticity: ${recipe.culturalAuthenticity}`);
      console.log(`   Budget Optimized: ${recipe.budgetOptimized ? 'Yes' : 'No'}`);
      
      // Log key ingredients with store intelligence
      console.log('   Key Ingredients:');
      recipe.ingredients.slice(0, 3).forEach(ingredient => {
        console.log(`     - ${ingredient.name}: $${ingredient.estimatedCost.toFixed(2)}`);
        if (ingredient.notes) {
          console.log(`       Notes: ${ingredient.notes}`);
        }
      });
    });

    // Log shopping list insights
    console.log('\n🛒 Shopping List Summary:');
    console.log(`   Total items: ${mealPlan.shoppingList.length}`);
    console.log(`   Pantry savings: $${mealPlan.savings.pantryItemsSavings.toFixed(2)}`);
    console.log(`   Total savings: $${mealPlan.savings.totalSavings.toFixed(2)}`);

    return NextResponse.json({
      success: true,
      message: 'Structured meal plan generated successfully',
      data: {
        mealPlan,
        performance: {
          generationTime: duration,
          recipeCount: mealPlan.recipes.length,
          budgetUtilization: mealPlan.budgetUtilization
        },
        testRequest
      }
    });

  } catch (error) {
    console.error('❌ Structured meal plan test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Structured Perplexity Meal Plan Test Endpoint',
    description: 'POST to this endpoint to test the structured meal plan generation with diverse cultural cuisines',
    testFeatures: [
      'Structured JSON Schema output from Perplexity',
      'Cultural cuisine intelligence (Korean, Mexican, West African)',
      'Store-aware ingredient matching',
      'Cost optimization with preferred stores',
      'Ingredient classification and substitution tips',
      'Bilingual ingredient support'
    ]
  });
}