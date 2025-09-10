import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { perplexityMealPlannerService } from '@/lib/meal-planning/perplexity-meal-planner';
import { KrogerPricingService } from '@/lib/integrations/kroger-pricing';
import { mealPlanService } from '@/lib/meal-plans/meal-plan-service';
import { Database } from '@/types/database';

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  
  // Check authentication - support both real and mock users
  let user: any = null;
  
  try {
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
    user = supabaseUser;
  } catch (error) {
    // If Supabase auth fails, check for mock user in headers
    const mockUserHeader = request.headers.get('x-mock-user');
    if (mockUserHeader) {
      user = JSON.parse(mockUserHeader);
    }
  }

  if (!user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
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
    zipCode,
    timeFrame = 'week',
    nutritionalGoals = [],
    excludeIngredients = []
  } = body;

  // Create a ReadableStream for Server-Sent Events with real API integration
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
          total: 6 
        });

        // Step 1: Create meal plan in database
        const mealPlan = await mealPlanService.createMealPlan(user.id, {
          name,
          description,
          culturalCuisines,
          dietaryRestrictions,
          budgetLimit,
          householdSize,
          zipCode,
          timeFrame,
          nutritionalGoals,
          excludeIngredients
        });
        
        mealPlanId = mealPlan.id;
        
        sendEvent('meal_plan_created', {
          mealPlanId: mealPlan.id,
          message: 'Meal plan created in database',
          step: 2,
          total: 6
        });

        sendEvent('status', { 
          message: 'Generating recipes with Perplexity AI...', 
          step: 2, 
          total: 4 
        });

        // Step 2: Generate complete recipes using Perplexity
        const perplexityPlanner = perplexityMealPlannerService;
        const numberOfMeals = Math.min(householdSize * 2, 8);
        
        const mealPlanRequest = {
          culturalCuisines: culturalCuisines || ['international'],
          dietaryRestrictions: dietaryRestrictions || [],
          weeklyBudget: budgetLimit,
          householdSize,
          numberOfMeals,
          pantryItems: excludeIngredients || [],
          location: zipCode
        };
        
        const perplexityResult = await perplexityPlanner.generateMealPlan(mealPlanRequest);
        
        if (!perplexityResult || !perplexityResult.recipes) {
          throw new Error('Failed to generate recipes with Perplexity AI');
        }

        sendEvent('recipes_generated', { 
          message: `Generated ${perplexityResult.recipes.length} complete recipes`, 
          step: 3, 
          total: 4,
          recipeCount: perplexityResult.recipes.length
        });

        // Step 3: Save recipes to database
        let extractedCount = 0;
        const totalRecipes = perplexityResult.recipes.length;

        for (const [index, recipe] of perplexityResult.recipes.entries()) {
          try {
            sendEvent('recipe_progress', { 
              message: `Saving recipe ${index + 1}/${totalRecipes}: ${recipe.title}`,
              current: index + 1,
              total: totalRecipes
            });

            // Prepare recipe data for database
            const recipeForDb = {
              title: recipe.title,
              description: recipe.description || '',
              culturalOrigin: recipe.culturalOrigin || ['international'],
              cuisine: recipe.cuisine || 'international',
              sourceUrl: null, // Perplexity generates original recipes
              imageUrl: null, // No image for generated recipes
              servings: recipe.servings || 4,
              prepTime: recipe.prepTime || 15,
              cookTime: recipe.cookTime || 30,
              totalTime: recipe.totalTime || 45,
              difficulty: recipe.difficulty || 'medium',
              instructions: Array.isArray(recipe.instructions) 
                ? recipe.instructions 
                : [recipe.instructions || 'Instructions not available'],
              tags: recipe.tags || [recipe.cuisine || 'international'],
              ingredients: recipe.ingredients.map((ing: any) => ({
                name: typeof ing === 'string' ? ing : ing.name,
                amount: typeof ing === 'string' ? '1' : ing.amount || '1',
                unit: typeof ing === 'string' ? 'serving' : ing.unit || 'serving',
                originalName: typeof ing === 'string' ? ing : ing.name,
                isSubstituted: false,
                userStatus: 'normal' as const
              }))
            };
            
            // Save recipe to database
            const savedRecipe = await mealPlanService.addRecipeToMealPlan(
              mealPlan.id, 
              recipeForDb
            );
            
            extractedCount++;
            
            // Stream the recipe with database ID
            sendEvent('recipe_saved', {
              recipe: {
                id: savedRecipe.id,
                mealPlanId: mealPlan.id,
                ...recipeForDb
              },
              index: extractedCount,
              total: totalRecipes,
              message: `Saved: ${recipe.title}`
            });
            
            // Log recipe added event
            await mealPlanService.logAnalyticsEvent(
              mealPlan.id,
              user.id,
              'recipe_added',
              { 
                recipeTitle: recipe.title,
                cuisine: recipe.cuisine,
                ingredientCount: recipeForDb.ingredients.length,
                extractionMethod: 'perplexity-direct'
              },
              culturalCuisines
            );
          } catch (error) {
            console.error(`Failed to save recipe ${recipe.title}:`, error);
            sendEvent('recipe_error', {
              message: `Failed to save: ${recipe.title}`,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Step 4: Add Kroger pricing if ZIP code provided
        if (zipCode && extractedCount > 0) {
          sendEvent('status', { 
            message: 'Adding Kroger pricing...', 
            step: 4, 
            total: 4 
          });

          try {
            const krogerService = new KrogerPricingService();
            const storeLocation = await krogerService.getStoreByZipCode(zipCode);
            
            if (storeLocation) {
              sendEvent('store_found', {
                message: `Found Kroger store: ${storeLocation.name}`,
                store: storeLocation
              });

              // Get updated meal plan with recipes
              const mealPlanWithRecipes = await mealPlanService.getMealPlanWithRecipes(mealPlan.id);
              let totalCost = 0;
              let pricedIngredients = 0;

              for (const recipe of mealPlanWithRecipes.recipes || []) {
                for (const ingredient of recipe.recipe_ingredients || []) {
                  try {
                    const pricingResult = await krogerService.searchIngredient(
                      ingredient.name,
                      storeLocation.locationId
                    );

                    if (pricingResult.success && pricingResult.products.length > 0) {
                      const bestMatch = pricingResult.products[0];
                      
                      await mealPlanService.updateRecipeIngredient(ingredient.id, {
                        kroger_product_id: bestMatch.productId,
                        kroger_product_name: bestMatch.description,
                        kroger_price: bestMatch.price,
                        kroger_unit_price: bestMatch.price,
                        kroger_confidence: 'high',
                        kroger_store_location: storeLocation.name,
                        kroger_brand: bestMatch.brand || null,
                        kroger_size: bestMatch.size || null,
                        on_sale: bestMatch.onSale || false,
                        sale_price: bestMatch.salePrice || null
                      });

                      totalCost += bestMatch.price;
                      pricedIngredients++;

                      sendEvent('ingredient_priced', {
                        ingredientName: ingredient.name,
                        price: bestMatch.price,
                        productName: bestMatch.description
                      });
                    }
                  } catch (error) {
                    console.error(`Error pricing ingredient ${ingredient.name}:`, error);
                  }

                  // Small delay to avoid rate limiting
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              }

              // Update meal plan with pricing
              const costPerServing = totalCost / (mealPlan.household_size * extractedCount);
              const budgetUtilization = (totalCost / mealPlan.budget_limit) * 100;

              await supabase
                .from('meal_plans')
                .update({
                  total_cost: totalCost,
                  cost_per_serving: costPerServing,
                  budget_utilization: budgetUtilization,
                  has_pricing: true,
                  zip_code: zipCode
                })
                .eq('id', mealPlan.id);

              sendEvent('pricing_complete', {
                totalCost,
                costPerServing,
                budgetUtilization,
                pricedIngredients,
                message: `Pricing complete: ${formatCurrency(totalCost)} (${budgetUtilization.toFixed(1)}% of budget)`
              });
            }
          } catch (pricingError) {
            console.error('Kroger pricing failed:', pricingError);
            sendEvent('pricing_error', {
              message: 'Kroger pricing unavailable, continuing without pricing',
              error: pricingError instanceof Error ? pricingError.message : 'Unknown error'
            });
          }
        }

        // Step 4: Finalize meal plan
        sendEvent('status', { 
          message: 'Finalizing meal plan...', 
          step: 4, 
          total: 4 
        });

        await mealPlanService.updateMealPlanStatus(mealPlan.id, 'active');
        
        // Get final meal plan with all recipes
        const finalMealPlan = await mealPlanService.getMealPlanWithRecipes(mealPlan.id);

        sendEvent('status', { 
          message: 'Meal plan completed successfully!', 
          step: 4, 
          total: 4 
        });

        // Send completion event
        sendEvent('complete', {
          mealPlan: finalMealPlan,
          extractedRecipes: extractedCount,
          totalRequested: totalRecipes,
          successRate: (extractedCount / totalRecipes) * 100,
          message: `Successfully created meal plan with ${extractedCount} recipes`
        });

        // Log completion event
        await mealPlanService.logAnalyticsEvent(
          mealPlan.id,
          user.id,
          'meal_plan_completed',
          { 
            extractedRecipes: extractedCount,
            totalRequested: totalRecipes,
            successRate: (extractedCount / totalRecipes) * 100,
            hasPricing: !!zipCode,
            totalCost: finalMealPlan.total_cost
          },
          culturalCuisines
        );

      } catch (error) {
        console.error('Production meal plan creation error:', error);
        
        // If we have a meal plan ID, mark it as failed
        if (mealPlanId) {
          try {
            await mealPlanService.updateMealPlanStatus(mealPlanId, 'failed');
            await mealPlanService.logAnalyticsEvent(
              mealPlanId,
              user.id,
              'meal_plan_failed',
              { error: error instanceof Error ? error.message : 'Unknown error' },
              culturalCuisines
            );
          } catch (updateError) {
            console.error('Failed to update meal plan status:', updateError);
          }
        }
        
        sendEvent('error', {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          step: 'failed'
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