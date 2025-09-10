import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { PerplexityRecipeUrlService } from '@/lib/meal-planning/perplexity-recipe-urls';
import { PerplexityRecipeExtractor } from '@/lib/integrations/perplexity-recipe-extractor';
import { OGImageExtractor } from '@/lib/integrations/og-image-extractor';
import { mealPlanService } from '@/lib/meal-plans/meal-plan-service';
import { Database } from '@/types/database';

export async function POST(request: NextRequest) {
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

  // Create a ReadableStream for Server-Sent Events with database persistence
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
          message: 'Creating meal plan...', 
          step: 1, 
          total: 5 
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
          message: 'Meal plan created successfully',
          step: 2,
          total: 5
        });

        // Log analytics event
        await mealPlanService.logAnalyticsEvent(
          mealPlan.id,
          user.id,
          'meal_plan_created',
          { budgetLimit, householdSize, timeFrame },
          culturalCuisines,
          budgetLimit <= 30 ? 'low' : budgetLimit <= 60 ? 'medium' : 'high'
        );

        sendEvent('status', { 
          message: 'Discovering recipe URLs...', 
          step: 2, 
          total: 5 
        });

        const urlService = new PerplexityRecipeUrlService();
        const extractor = new PerplexityRecipeExtractor();
        const imageExtractor = new OGImageExtractor();

        // Step 2: Get recipe URLs
        const urlRequest = {
          numberOfMeals: Math.min(householdSize * 2, 8),
          culturalCuisines,
          dietaryRestrictions,
          maxTime: timeFrame.includes('quick') ? 30 : undefined,
          exclude: excludeIngredients
        };
        
        const urlResponse = await urlService.getRecipeUrls(urlRequest);
        
        if (!urlResponse.success) {
          throw new Error('Failed to find recipe URLs');
        }

        sendEvent('status', { 
          message: `Found ${urlResponse.recipes.length} recipe URLs. Extracting recipes...`, 
          step: 3, 
          total: 5,
          recipeUrls: urlResponse.recipes.length
        });

        // Step 3: Extract recipes and save to database
        let extractedCount = 0;
        const totalRecipes = urlResponse.recipes.length;

        for (const [index, recipeInfo] of urlResponse.recipes.entries()) {
          try {
            sendEvent('progress', { 
              message: `Extracting recipe ${index + 1}/${totalRecipes}...`,
              current: index + 1,
              total: totalRecipes,
              url: recipeInfo.url
            });

            // Extract recipe using Perplexity
            const recipeData = await extractor.extractRecipe(recipeInfo.url);
            
            if (recipeData && recipeData.ingredients.length > 0) {
              // Get recipe image
              let imageUrl = recipeData.imageUrl;
              if (!imageUrl) {
                try {
                  const ogData = await imageExtractor.extractOGImage(recipeInfo.url);
                  imageUrl = ogData.bestImage || ogData.ogImage || ogData.twitterImage || null;
                } catch (error) {
                  imageUrl = null;
                }
              }
              
              // Prepare recipe data for database
              const recipeForDb = {
                title: recipeData.title,
                description: recipeData.description || '',
                culturalOrigin: [recipeInfo.cuisine || 'international'],
                cuisine: recipeInfo.cuisine || 'international',
                sourceUrl: recipeInfo.url,
                imageUrl,
                servings: recipeData.servings || 4,
                prepTime: Math.floor((recipeData.totalTimeMinutes || 45) * 0.3),
                cookTime: Math.floor((recipeData.totalTimeMinutes || 45) * 0.7),
                totalTime: recipeData.totalTimeMinutes || 45,
                difficulty: 'medium',
                instructions: recipeData.instructions,
                tags: [recipeInfo.cuisine || 'international'],
                ingredients: recipeData.ingredients.map((ing: string) => ({
                  name: ing,
                  amount: '1',
                  unit: 'serving',
                  originalName: ing,
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
              sendEvent('recipe', {
                recipe: {
                  id: savedRecipe.id,
                  mealPlanId: mealPlan.id,
                  ...recipeForDb
                },
                index: extractedCount,
                total: totalRecipes,
                message: `Saved: ${recipeData.title}`
              });
              
              // Log recipe added event
              await mealPlanService.logAnalyticsEvent(
                mealPlan.id,
                user.id,
                'recipe_added',
                { 
                  recipeTitle: recipeData.title,
                  cuisine: recipeInfo.cuisine,
                  ingredientCount: recipeData.ingredients.length
                },
                culturalCuisines
              );
            }
          } catch (error) {
            console.error(`Failed to extract recipe from ${recipeInfo.url}:`, error);
            sendEvent('error', {
              message: `Failed to extract recipe from ${recipeInfo.url}`,
              url: recipeInfo.url,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Step 4: Update meal plan status and calculate totals
        sendEvent('status', { 
          message: 'Calculating meal plan totals...', 
          step: 4, 
          total: 5 
        });

        await mealPlanService.updateMealPlanStatus(mealPlan.id, 'active');
        
        // Get final meal plan with all recipes
        const finalMealPlan = await mealPlanService.getMealPlanWithRecipes(mealPlan.id);

        sendEvent('status', { 
          message: 'Meal plan completed!', 
          step: 5, 
          total: 5 
        });

        // Send completion event
        sendEvent('complete', {
          mealPlan: finalMealPlan,
          extractedRecipes: extractedCount,
          totalRequested: totalRecipes,
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
            successRate: (extractedCount / totalRecipes) * 100
          },
          culturalCuisines
        );

      } catch (error) {
        console.error('Meal plan creation error:', error);
        
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}