import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { mealPlanService } from '@/lib/meal-plans/meal-plan-service';
import { KrogerPricingService } from '@/lib/integrations/kroger-pricing';
import { Database } from '@/types/database';

// POST /api/meal-plans/[id]/pricing - Add Kroger pricing to meal plan
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const body = await request.json();
  const { zipCode } = body;

  if (!zipCode) {
    return new Response(
      JSON.stringify({ success: false, error: 'ZIP code is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

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
        // Verify ownership and get meal plan
        const mealPlan = await mealPlanService.getMealPlanWithRecipes(params.id);
        if (mealPlan.user_id !== user.id) {
          sendEvent('error', { message: 'Meal plan not found' });
          controller.close();
          return;
        }

        sendEvent('status', { 
          message: 'Initializing Kroger pricing service...', 
          step: 1, 
          total: 4 
        });

        const krogerService = new KrogerPricingService();
        
        sendEvent('status', { 
          message: 'Finding Kroger store location...', 
          step: 2, 
          total: 4 
        });

        // Get store location
        const storeLocation = await krogerService.getStoreByZipCode(zipCode);
        if (!storeLocation) {
          sendEvent('error', { message: 'No Kroger store found for this ZIP code' });
          controller.close();
          return;
        }

        sendEvent('status', { 
          message: `Found store: ${storeLocation.name}. Processing recipes...`, 
          step: 3, 
          total: 4,
          store: storeLocation
        });

        let totalIngredients = 0;
        let pricedIngredients = 0;
        let totalCost = 0;

        // Count total ingredients
        for (const recipe of mealPlan.recipes || []) {
          totalIngredients += recipe.recipe_ingredients?.length || 0;
        }

        let processedIngredients = 0;

        // Process each recipe
        for (const recipe of mealPlan.recipes || []) {
          sendEvent('recipe_start', {
            recipeId: recipe.id,
            recipeName: recipe.title,
            ingredientCount: recipe.recipe_ingredients?.length || 0
          });

          // Process each ingredient
          for (const ingredient of recipe.recipe_ingredients || []) {
            processedIngredients++;
            
            sendEvent('ingredient_progress', {
              current: processedIngredients,
              total: totalIngredients,
              ingredientName: ingredient.name,
              recipeTitle: recipe.title
            });

            try {
              // Skip if already has pricing or user marked as already-have
              if (ingredient.kroger_price || ingredient.user_status === 'already-have') {
                if (ingredient.kroger_price && ingredient.user_status !== 'already-have') {
                  totalCost += ingredient.kroger_price;
                  pricedIngredients++;
                }
                continue;
              }

              // Get pricing from Kroger
              const pricingResult = await krogerService.searchIngredient(
                ingredient.name,
                storeLocation.locationId
              );

              if (pricingResult.success && pricingResult.products.length > 0) {
                const bestMatch = pricingResult.products[0];
                
                // Update ingredient with pricing
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
                  ingredientId: ingredient.id,
                  ingredientName: ingredient.name,
                  price: bestMatch.price,
                  productName: bestMatch.description,
                  confidence: 'high'
                });
              } else {
                sendEvent('ingredient_not_found', {
                  ingredientId: ingredient.id,
                  ingredientName: ingredient.name,
                  message: 'No Kroger product found'
                });
              }
            } catch (error) {
              console.error(`Error pricing ingredient ${ingredient.name}:`, error);
              sendEvent('ingredient_error', {
                ingredientId: ingredient.id,
                ingredientName: ingredient.name,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          sendEvent('recipe_complete', {
            recipeId: recipe.id,
            recipeName: recipe.title
          });
        }

        sendEvent('status', { 
          message: 'Updating meal plan totals...', 
          step: 4, 
          total: 4 
        });

        // Update meal plan with pricing info
        const costPerServing = totalCost / (mealPlan.household_size * (mealPlan.recipes?.length || 1));
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
          .eq('id', params.id);

        // Log analytics event
        await mealPlanService.logAnalyticsEvent(
          params.id,
          user.id,
          'pricing_added',
          {
            totalIngredients,
            pricedIngredients,
            totalCost,
            costPerServing,
            budgetUtilization,
            storeLocation: storeLocation.name
          },
          mealPlan.cultural_cuisines,
          mealPlan.budget_limit <= 30 ? 'low' : mealPlan.budget_limit <= 60 ? 'medium' : 'high'
        );

        // Send completion event
        sendEvent('complete', {
          totalIngredients,
          pricedIngredients,
          totalCost,
          costPerServing,
          budgetUtilization,
          storeLocation,
          message: `Pricing complete! Found prices for ${pricedIngredients}/${totalIngredients} ingredients`
        });

      } catch (error) {
        console.error('Pricing error:', error);
        sendEvent('error', {
          message: error instanceof Error ? error.message : 'Unknown error occurred'
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}