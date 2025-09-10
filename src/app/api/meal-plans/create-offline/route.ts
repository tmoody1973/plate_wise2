import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { offlineMealPlanner } from '@/lib/meal-planning/offline-meal-planner';
import { mealPlanService } from '@/lib/meal-plans/meal-plan-service';
import { Database } from '@/types/database';

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  
  // Check authentication - support both real and mock users
  let user: any = null;
  
  try {
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    user = supabaseUser;
  } catch (error) {
    // If Supabase auth fails, check for mock user in headers
    const mockUserHeader = request.headers.get('x-mock-user');
    if (mockUserHeader) {
      user = JSON.parse(mockUserHeader);
    }
  }

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const {
    name,
    description,
    culturalCuisines = ['international'],
    dietaryRestrictions = [],
    budgetLimit = 50,
    householdSize = 4,
    timeFrame = 'week',
    numberOfMeals = 6
  } = body;

  // Create a ReadableStream for Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Helper function to send SSE data
      const sendEvent = (event: string, data: any) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      let mealPlanId: string | null = null;

      try {
        sendEvent('status', { 
          message: 'Creating meal plan in database...', 
          step: 1, 
          total: 4 
        });

        // Step 1: Create meal plan in database
        const mealPlan = await mealPlanService.createMealPlan(user.id, {
          name,
          description,
          culturalCuisines,
          dietaryRestrictions,
          budgetLimit,
          householdSize,
          timeFrame,
          nutritionalGoals: [],
          excludeIngredients: []
        });
        
        mealPlanId = mealPlan.id;
        
        sendEvent('meal_plan_created', {
          mealPlanId: mealPlan.id,
          message: 'Meal plan created in database',
          step: 2,
          total: 4
        });

        sendEvent('status', { 
          message: 'Generating recipes from offline database...', 
          step: 2, 
          total: 4 
        });

        // Step 2: Generate meal plan using offline system
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
          step: 3, 
          total: 4,
          recipeCount: mealPlanResult.recipes.length
        });

        // Step 3: Save recipes to database
        let savedCount = 0;
        for (const offlineRecipe of mealPlanResult.recipes) {
          try {
            const recipeForDb = {
              title: offlineRecipe.title,
              description: offlineRecipe.description,
              culturalOrigin: offlineRecipe.culturalOrigin,
              cuisine: offlineRecipe.cuisine,
              sourceUrl: null,
              imageUrl: null,
              servings: offlineRecipe.servings,
              prepTime: offlineRecipe.prepTime,
              cookTime: offlineRecipe.cookTime,
              totalTime: offlineRecipe.totalTime,
              difficulty: offlineRecipe.difficulty,
              instructions: offlineRecipe.instructions,
              tags: offlineRecipe.tags,
              ingredients: offlineRecipe.ingredients.map(ing => ({
                name: ing.name,
                amount: ing.amount,
                unit: ing.unit,
                originalName: ing.name,
                isSubstituted: false,
                userStatus: 'normal' as const,
                estimatedPrice: ing.estimatedPrice
              }))
            };
            
            const savedRecipe = await mealPlanService.addRecipeToMealPlan(
              mealPlan.id, 
              recipeForDb
            );
            
            savedCount++;
            
            sendEvent('recipe_saved', {
              recipe: {
                id: savedRecipe.id,
                mealPlanId: mealPlan.id,
                ...recipeForDb
              },
              index: savedCount,
              total: mealPlanResult.recipes.length,
              message: `Saved: ${offlineRecipe.title}`
            });

            // Log recipe added event
            await mealPlanService.logAnalyticsEvent(
              mealPlan.id,
              user.id,
              'recipe_added',
              { 
                recipeTitle: offlineRecipe.title,
                cuisine: offlineRecipe.cuisine,
                ingredientCount: offlineRecipe.ingredients.length,
                extractionMethod: 'offline-database',
                estimatedCost: offlineRecipe.estimatedCost
              },
              culturalCuisines
            );
            
          } catch (error) {
            console.error(`Failed to save recipe ${offlineRecipe.title}:`, error);
            sendEvent('recipe_error', {
              message: `Failed to save: ${offlineRecipe.title}`,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Step 4: Update meal plan with totals
        sendEvent('status', { 
          message: 'Finalizing meal plan with cost estimates...', 
          step: 4, 
          total: 4 
        });

        const costPerServing = mealPlanResult.totalCost / (mealPlan.household_size * savedCount);
        const budgetUtilization = (mealPlanResult.totalCost / mealPlan.budget_limit) * 100;

        await supabase
          .from('meal_plans')
          .update({
            total_cost: mealPlanResult.totalCost,
            cost_per_serving: costPerServing,
            budget_utilization: budgetUtilization,
            has_pricing: true,
            status: 'active'
          })
          .eq('id', mealPlan.id);

        sendEvent('pricing_complete', {
          totalCost: mealPlanResult.totalCost,
          costPerServing,
          budgetUtilization,
          message: `Cost estimates complete: ${formatCurrency(mealPlanResult.totalCost)} (${budgetUtilization.toFixed(1)}% of budget)`
        });

        // Get final meal plan with all recipes
        const finalMealPlan = await mealPlanService.getMealPlanWithRecipes(mealPlan.id);

        sendEvent('status', { 
          message: 'Offline meal plan completed successfully!', 
          step: 4, 
          total: 4 
        });

        // Send completion event
        sendEvent('complete', {
          mealPlan: finalMealPlan,
          savedRecipes: savedCount,
          totalRequested: numberOfMeals,
          successRate: (savedCount / numberOfMeals) * 100,
          totalCost: mealPlanResult.totalCost,
          budgetUtilization,
          message: `Successfully created offline meal plan with ${savedCount} recipes`,
          source: 'offline-database'
        });

        // Log completion event
        await mealPlanService.logAnalyticsEvent(
          mealPlan.id,
          user.id,
          'meal_plan_completed',
          { 
            savedRecipes: savedCount,
            totalRequested: numberOfMeals,
            successRate: (savedCount / numberOfMeals) * 100,
            hasPricing: true,
            totalCost: mealPlanResult.totalCost,
            source: 'offline-database'
          },
          culturalCuisines
        );

      } catch (error) {
        console.error('Offline meal plan creation error:', error);
        
        // If we have a meal plan ID, mark it as failed
        if (mealPlanId) {
          try {
            await mealPlanService.updateMealPlanStatus(mealPlanId, 'failed');
            await mealPlanService.logAnalyticsEvent(
              mealPlanId,
              user.id,
              'meal_plan_failed',
              { 
                error: error instanceof Error ? error.message : 'Unknown error',
                source: 'offline-database'
              },
              culturalCuisines
            );
          } catch (updateError) {
            console.error('Failed to update meal plan status:', updateError);
          }
        }
        
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-mock-user',
    },
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}