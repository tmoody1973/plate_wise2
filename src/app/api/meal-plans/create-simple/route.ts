import { NextRequest, NextResponse } from 'next/server';
import { offlineMealPlanner } from '@/lib/meal-planning/offline-meal-planner';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name = 'My Meal Plan',
      culturalCuisines = ['international'],
      dietaryRestrictions = [],
      budgetLimit = 50,
      householdSize = 4,
      timeFrame = 'week',
      numberOfMeals = 6
    } = body;

    console.log('🍽️ Generating simple meal plan without authentication...');

    // Create a ReadableStream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Helper function to send SSE data
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        try {
          sendEvent('status', { 
            message: 'Generating recipes from offline database...', 
            step: 1, 
            total: 2 
          });

          // Generate meal plan using offline system
          const mealPlanResult = await offlineMealPlanner.generateMealPlan({
            culturalCuisines,
            dietaryRestrictions,
            budgetLimit,
            householdSize,
            timeFrame,
            numberOfMeals
          });

          if (!mealPlanResult.success) {
            throw new Error(mealPlanResult.message);
          }

          sendEvent('recipes_generated', { 
            message: `Generated ${mealPlanResult.recipes.length} recipes from offline database`, 
            step: 2, 
            total: 2,
            recipeCount: mealPlanResult.recipes.length
          });

          // Convert offline recipes to the expected format
          const recipes = mealPlanResult.recipes.map((recipe, index) => ({
            id: `offline-${index}`,
            title: recipe.title,
            description: recipe.description,
            culturalOrigin: recipe.culturalOrigin,
            cuisine: recipe.cuisine,
            ingredients: recipe.ingredients.map((ing, ingIndex) => ({
              id: `ing-${index}-${ingIndex}`,
              name: ing.name,
              amount: ing.amount,
              unit: ing.unit,
              originalName: ing.name,
              isSubstituted: false,
              userStatus: 'normal' as const,
              estimatedPrice: ing.estimatedPrice
            })),
            instructions: recipe.instructions,
            servings: recipe.servings,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            totalTime: recipe.totalTime,
            difficulty: recipe.difficulty,
            tags: recipe.tags,
            estimatedCost: recipe.estimatedCost,
            nutritionalInfo: recipe.nutritionalInfo
          }));

          // Create a simple meal plan object
          const simpleMealPlan = {
            id: `simple-${Date.now()}`,
            name,
            description: `Offline meal plan with ${recipes.length} recipes`,
            status: 'active',
            recipes,
            total_cost: mealPlanResult.totalCost,
            cost_per_serving: mealPlanResult.costPerServing,
            budget_utilization: mealPlanResult.budgetUtilization,
            household_size: householdSize,
            budget_limit: budgetLimit,
            cultural_cuisines: culturalCuisines,
            dietary_restrictions: dietaryRestrictions,
            created_at: new Date().toISOString()
          };

          // Send completion event
          sendEvent('complete', {
            mealPlan: simpleMealPlan,
            savedRecipes: recipes.length,
            totalRequested: numberOfMeals,
            successRate: (recipes.length / numberOfMeals) * 100,
            totalCost: mealPlanResult.totalCost,
            budgetUtilization: mealPlanResult.budgetUtilization,
            message: `Successfully created simple meal plan with ${recipes.length} recipes`,
            source: 'offline-database'
          });

        } catch (error) {
          console.error('Simple meal plan creation error:', error);
          
          sendEvent('error', {
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            step: 'failed',
            source: 'offline-database'
          });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Simple meal plan API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}