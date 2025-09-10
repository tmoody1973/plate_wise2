import { NextRequest, NextResponse } from 'next/server';
import { perplexityMealPlannerService } from '@/lib/meal-planning/perplexity-meal-planner';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name = 'Perplexity Meal Plan',
      culturalCuisines = ['international'],
      dietaryRestrictions = [],
      budgetLimit = 50,
      householdSize = 4,
      timeFrame = 'week',
      numberOfMeals = 6,
      excludeIngredients = []
    } = body;

    console.log('🤖 Generating real recipes with Perplexity AI...');

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
            message: 'Connecting to Perplexity AI...', 
            step: 1, 
            total: 3 
          });

          // Generate meal plan using Perplexity
          const perplexityPlanner = perplexityMealPlannerService;
          
          const mealPlanRequest = {
            culturalCuisines: culturalCuisines || ['international'],
            dietaryRestrictions: dietaryRestrictions || [],
            weeklyBudget: budgetLimit,
            householdSize,
            numberOfMeals,
            pantryItems: excludeIngredients || [],
            location: undefined
          };

          sendEvent('status', { 
            message: 'Generating recipes with Perplexity AI...', 
            step: 2, 
            total: 3 
          });

          console.log('🔄 Calling Perplexity meal planner service...');
          const perplexityResult = await perplexityPlanner.generateMealPlan(mealPlanRequest);
          console.log('✅ Perplexity service completed');

          if (!perplexityResult || !perplexityResult.recipes) {
            console.error('❌ Perplexity result invalid:', perplexityResult);
            throw new Error('Perplexity AI failed: No recipes generated');
          }

          console.log(`📋 Generated ${perplexityResult.recipes.length} recipes`);

          sendEvent('recipes_generated', { 
            message: `Generated ${perplexityResult.recipes.length} real recipes from Perplexity AI`, 
            step: 3, 
            total: 3,
            recipeCount: perplexityResult.recipes.length
          });

          // Convert Perplexity meal plan recipes to the expected format
          console.log('🔍 Sample recipe structure:', JSON.stringify(perplexityResult.recipes[0], null, 2));
          
          const recipes = perplexityResult.recipes.map((recipe, index) => {
            console.log(`🔄 Converting recipe ${index + 1}:`, recipe.title);
            console.log(`   - Has ingredients: ${!!recipe.ingredients}, count: ${recipe.ingredients?.length || 0}`);
            console.log(`   - Has instructions: ${!!recipe.instructions}, count: ${recipe.instructions?.length || 0}`);
            
            return {
            id: `perplexity-${index}`,
            title: recipe.title,
            description: recipe.description || '',
            culturalOrigin: recipe.culturalOrigin || [recipe.cuisine || 'international'],
            cuisine: recipe.cuisine || 'international',
            ingredients: (recipe.ingredients || []).map((ing, ingIndex) => {
              // Handle both string and object ingredient formats
              const ingredient = typeof ing === 'string' ? { name: ing, amount: '1', unit: 'serving' } : ing;
              return {
                id: `ing-${index}-${ingIndex}`,
                name: ingredient.name || `Ingredient ${ingIndex + 1}`,
                amount: ingredient.amount || '1',
                unit: ingredient.unit || 'serving',
                originalName: ingredient.name || `Ingredient ${ingIndex + 1}`,
                isSubstituted: false,
                userStatus: 'normal' as const
              };
            }),
            instructions: Array.isArray(recipe.instructions) 
              ? recipe.instructions 
              : recipe.instructions 
              ? [recipe.instructions]
              : ['Instructions not available'],
            servings: recipe.servings || 4,
            prepTime: recipe.prepTime || 15,
            cookTime: recipe.cookTime || 30,
            totalTime: recipe.totalTime || 45,
            difficulty: recipe.difficulty || 'medium',
            tags: recipe.tags || [recipe.cuisine || 'international'],
            metadata: {
              servings: recipe.servings || 4,
              totalTime: recipe.totalTime || 45,
              estimatedTime: recipe.totalTime || 45
            },
            source: 'perplexity-ai',
            sourceUrl: null, // Perplexity generates original recipes
            imageUrl: null
            };
          });

          // Use costs from Perplexity meal plan
          const totalEstimatedCost = perplexityResult.totalEstimatedCost || (budgetLimit * 0.8);
          const costPerServing = totalEstimatedCost / (householdSize * recipes.length);
          const budgetUtilization = perplexityResult.budgetUtilization || ((totalEstimatedCost / budgetLimit) * 100);

          // Create temporary meal plan object
          const perplexityMealPlan = {
            id: `perplexity-${Date.now()}`,
            name,
            description: `Perplexity AI meal plan with ${recipes.length} real recipes`,
            status: 'active',
            recipes,
            total_cost: totalEstimatedCost,
            cost_per_serving: costPerServing,
            budget_utilization: budgetUtilization,
            household_size: householdSize,
            budget_limit: budgetLimit,
            cultural_cuisines: culturalCuisines,
            dietary_restrictions: dietaryRestrictions,
            created_at: new Date().toISOString(),
            source: 'perplexity-ai'
          };

          // Send completion event
          sendEvent('complete', {
            mealPlan: perplexityMealPlan,
            savedRecipes: recipes.length,
            totalRequested: numberOfMeals,
            successRate: (recipes.length / numberOfMeals) * 100,
            totalCost: totalEstimatedCost,
            budgetUtilization,
            message: `Successfully created Perplexity meal plan with ${recipes.length} real recipes (temporary)`,
            source: 'perplexity-ai',
            apiUsed: 'Perplexity AI (sonar model)'
          });

        } catch (error) {
          console.error('Perplexity meal plan creation error:', error);
          
          sendEvent('error', {
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            step: 'failed',
            source: 'perplexity-ai',
            details: error instanceof Error ? error.stack : undefined
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
    console.error('Perplexity meal plan API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'perplexity-api'
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