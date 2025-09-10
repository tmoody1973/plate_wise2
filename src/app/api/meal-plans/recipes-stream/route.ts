import { NextRequest } from 'next/server';
import { PerplexityRecipeUrlService } from '@/lib/meal-planning/perplexity-recipe-urls';
import { PerplexityRecipeExtractor } from '@/lib/integrations/perplexity-recipe-extractor';
import { OGImageExtractor } from '@/lib/integrations/og-image-extractor';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    culturalCuisines = ['mexican'],
    dietaryRestrictions = [],
    householdSize = 4,
    timeFrame = 'week',
    nutritionalGoals = [],
    excludeIngredients = []
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

      try {
        sendEvent('status', { message: 'Starting recipe discovery...', step: 1, total: 4 });

        const urlService = new PerplexityRecipeUrlService();
        const extractor = new PerplexityRecipeExtractor();
        const imageExtractor = new OGImageExtractor();

        // Step 1: Get recipe URLs
        const urlRequest = {
          numberOfMeals: Math.min(householdSize * 2, 8),
          culturalCuisines,
          dietaryRestrictions,
          maxTime: timeFrame.includes('quick') ? 30 : undefined,
          exclude: excludeIngredients
        };
        
        const urlResponse = await urlService.getRecipeUrls(urlRequest);
        
        if (!urlResponse.success) {
          sendEvent('error', { message: 'Failed to find recipe URLs' });
          controller.close();
          return;
        }

        sendEvent('status', { 
          message: `Found ${urlResponse.recipes.length} recipe URLs. Starting extraction...`, 
          step: 2, 
          total: 4,
          recipeUrls: urlResponse.recipes.length
        });

        // Step 2: Extract recipes one by one and stream them
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
              // Get recipe image (don't let it block)
              let imageUrl = recipeData.imageUrl;
              if (!imageUrl) {
                try {
                  const ogData = await imageExtractor.extractOGImage(recipeInfo.url);
                  imageUrl = ogData.bestImage || ogData.ogImage || ogData.twitterImage || null;
                } catch (error) {
                  imageUrl = null;
                }
              }
              
              const recipe = {
                id: `recipe-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 8)}`,
                title: recipeData.title,
                description: recipeData.description || '',
                culturalOrigin: [recipeInfo.cuisine || 'international'],
                cuisine: recipeInfo.cuisine || 'international',
                ingredients: recipeData.ingredients.map((ing, ingIndex) => ({
                  id: `ingredient-${index}-${ingIndex}`,
                  name: ing,
                  amount: '1', // Default amount since extractor returns string array
                  unit: 'serving',
                  originalName: ing, // Keep original for search
                  isSubstituted: false,
                  userStatus: 'normal' as const
                })),
                instructions: recipeData.instructions,
                metadata: {
                  servings: recipeData.servings || 4,
                  prepTime: Math.floor((recipeData.totalTimeMinutes || 45) * 0.3),
                  cookTime: Math.floor((recipeData.totalTimeMinutes || 45) * 0.7),
                  totalTime: recipeData.totalTimeMinutes || 45,
                  difficulty: 'medium',
                  culturalAuthenticity: 'medium',
                  estimatedTime: recipeInfo.estimatedTime || 45
                },
                imageUrl,
                source: 'perplexity',
                sourceUrl: recipeInfo.url,
                tags: [recipeInfo.cuisine || 'international'],
                hasPricing: false, // Indicates pricing not yet loaded
                createdAt: new Date(),
                updatedAt: new Date()
              };
              
              extractedCount++;
              
              // Stream the recipe immediately
              sendEvent('recipe', {
                recipe,
                index: extractedCount,
                total: totalRecipes,
                message: `Extracted: ${recipe.title}`
              });
              
            } else {
              sendEvent('warning', { 
                message: `No ingredients found for recipe ${index + 1}`,
                url: recipeInfo.url
              });
            }
          } catch (error) {
            sendEvent('warning', { 
              message: `Failed to extract recipe ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              url: recipeInfo.url
            });
          }
        }

        // Send completion event
        sendEvent('complete', {
          message: `Recipe extraction complete! Found ${extractedCount} recipes.`,
          totalRecipes: extractedCount,
          summary: {
            totalRecipes: extractedCount,
            culturalDiversity: [...new Set(urlResponse.recipes.map(r => r.cuisine))],
            averageTime: Math.round(urlResponse.recipes.reduce((sum, r) => sum + (r.estimatedTime || 45), 0) / urlResponse.recipes.length),
            readyForPricing: true
          }
        });

      } catch (error) {
        sendEvent('error', {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString()
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
}

// GET endpoint for quick testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cuisine = searchParams.get('cuisine') || 'mexican';
  const people = parseInt(searchParams.get('people') || '4');

  // Forward to POST endpoint with sample data
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({
      culturalCuisines: [cuisine],
      householdSize: people
    })
  }));
}