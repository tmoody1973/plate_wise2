import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name = 'Simple Perplexity Meal Plan',
      culturalCuisines = ['international'],
      dietaryRestrictions = [],
      budgetLimit = 50,
      householdSize = 4,
      numberOfMeals = 3
    } = body;

    console.log('🤖 Starting simple Perplexity meal plan generation...');

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
            message: 'Checking Perplexity API...', 
            step: 1, 
            total: 3 
          });

          const apiKey = process.env.PERPLEXITY_API_KEY;
          
          if (!apiKey) {
            throw new Error('PERPLEXITY_API_KEY not found in environment variables');
          }

          sendEvent('status', { 
            message: 'Generating recipes with Perplexity AI...', 
            step: 2, 
            total: 3 
          });

          // Create a simple prompt for meal planning
          const cuisineText = culturalCuisines.join(', ');
          const dietaryText = dietaryRestrictions.length > 0 ? ` with ${dietaryRestrictions.join(', ')} restrictions` : '';
          
          const prompt = `Generate ${numberOfMeals} simple ${cuisineText} recipes${dietaryText} for ${householdSize} people within a $${budgetLimit} budget. 

Return ONLY a JSON array of recipes in this exact format:
[
  {
    "title": "Recipe Name",
    "cuisine": "cuisine_type",
    "ingredients": ["ingredient 1", "ingredient 2", "ingredient 3"],
    "instructions": ["step 1", "step 2", "step 3"],
    "servings": 4,
    "prepTime": 15,
    "cookTime": 30,
    "difficulty": "easy"
  }
]

Make sure the JSON is valid and contains exactly ${numberOfMeals} recipes.`;

          const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'sonar',
              messages: [
                {
                  role: 'system',
                  content: 'You are a helpful cooking assistant. Always return valid JSON arrays of recipes as requested.'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              max_tokens: 2000,
              temperature: 0.7
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          console.log('Perplexity API response:', data);

          // Extract the content from the response
          const content = data.choices?.[0]?.message?.content;
          if (!content) {
            throw new Error('No content received from Perplexity API');
          }

          // Try to parse the JSON response
          let recipes;
          try {
            // Clean up the content to extract JSON
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              recipes = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('No JSON array found in response');
            }
          } catch (parseError) {
            console.error('Failed to parse Perplexity response:', content);
            throw new Error(`Failed to parse recipe JSON: ${parseError}`);
          }

          if (!Array.isArray(recipes)) {
            throw new Error('Response is not an array of recipes');
          }

          sendEvent('recipes_generated', { 
            message: `Generated ${recipes.length} recipes from Perplexity AI`, 
            step: 3, 
            total: 3,
            recipeCount: recipes.length
          });

          // Convert to expected format
          const formattedRecipes = recipes.map((recipe, index) => ({
            id: `simple-perplexity-${index}`,
            title: recipe.title || 'Untitled Recipe',
            description: `A delicious ${recipe.cuisine || 'international'} recipe`,
            culturalOrigin: [recipe.cuisine || 'international'],
            cuisine: recipe.cuisine || 'international',
            ingredients: (recipe.ingredients || []).map((ing, ingIndex) => ({
              id: `ing-${index}-${ingIndex}`,
              name: ing,
              amount: '1',
              unit: 'serving',
              originalName: ing,
              isSubstituted: false,
              userStatus: 'normal' as const
            })),
            instructions: recipe.instructions || ['Instructions not available'],
            servings: recipe.servings || 4,
            prepTime: recipe.prepTime || 15,
            cookTime: recipe.cookTime || 30,
            totalTime: (recipe.prepTime || 15) + (recipe.cookTime || 30),
            difficulty: recipe.difficulty || 'medium',
            tags: [recipe.cuisine || 'international'],
            metadata: {
              servings: recipe.servings || 4,
              totalTime: (recipe.prepTime || 15) + (recipe.cookTime || 30),
              estimatedTime: (recipe.prepTime || 15) + (recipe.cookTime || 30)
            },
            source: 'perplexity-ai-simple',
            sourceUrl: null,
            imageUrl: null
          }));

          // Calculate simple cost estimates
          const estimatedCostPerRecipe = budgetLimit / numberOfMeals;
          const totalEstimatedCost = formattedRecipes.length * estimatedCostPerRecipe;
          const costPerServing = totalEstimatedCost / (householdSize * formattedRecipes.length);
          const budgetUtilization = (totalEstimatedCost / budgetLimit) * 100;

          // Create meal plan object
          const mealPlan = {
            id: `simple-perplexity-${Date.now()}`,
            name,
            description: `Simple Perplexity AI meal plan with ${formattedRecipes.length} recipes`,
            status: 'active',
            recipes: formattedRecipes,
            total_cost: totalEstimatedCost,
            cost_per_serving: costPerServing,
            budget_utilization: budgetUtilization,
            household_size: householdSize,
            budget_limit: budgetLimit,
            cultural_cuisines: culturalCuisines,
            dietary_restrictions: dietaryRestrictions,
            created_at: new Date().toISOString(),
            source: 'perplexity-ai-simple'
          };

          // Send completion event
          sendEvent('complete', {
            mealPlan,
            savedRecipes: formattedRecipes.length,
            totalRequested: numberOfMeals,
            successRate: (formattedRecipes.length / numberOfMeals) * 100,
            totalCost: totalEstimatedCost,
            budgetUtilization,
            message: `Successfully created simple Perplexity meal plan with ${formattedRecipes.length} recipes`,
            source: 'perplexity-ai-simple',
            rawResponse: content.slice(0, 200) + '...' // First 200 chars for debugging
          });

        } catch (error) {
          console.error('Simple Perplexity meal plan creation error:', error);
          
          sendEvent('error', {
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            step: 'failed',
            source: 'perplexity-ai-simple',
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
    console.error('Simple Perplexity meal plan API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'perplexity-api-simple'
      },
      { status: 500 }
    );
  }
}