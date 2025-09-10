/**
 * Test API endpoint for two-stage recipe search workflow
 * Tests Tavily URL discovery + Groq/Perplexity content parsing
 */

import { NextRequest, NextResponse } from 'next/server';
import { TavilyPerplexitySearchService } from '@/lib/meal-planning/tavily-perplexity-search';
import type { EnhancedRecipeSearchRequest } from '@/lib/integrations/recipe-types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const searchRequest: EnhancedRecipeSearchRequest = {
      query: body.query || 'easy dinner recipes',
      culturalCuisine: body.culturalCuisine,
      dietaryRestrictions: body.dietaryRestrictions || [],
      maxResults: body.maxResults || 3,
      maxTimeMinutes: body.maxTimeMinutes
    };

    const options = {
      maxConcurrent: body.maxConcurrent || 3,
      timeoutMs: body.timeoutMs || 15000
    };

    console.log('🚀 Starting two-stage recipe search workflow...');
    console.log('Search request:', JSON.stringify(searchRequest, null, 2));
    console.log('Options:', JSON.stringify(options, null, 2));

    const searchService = new TavilyPerplexitySearchService();
    
    // Track progress
    const progressUpdates: any[] = [];
    
    const startTime = Date.now();
    const result = await searchService.searchRecipes(
      searchRequest,
      options,
      (progress) => {
        progressUpdates.push({
          ...progress,
          timestamp: Date.now() - startTime
        });
        console.log(`Progress: ${progress.stage} - URLs: ${progress.urlsFound}, Processed: ${progress.recipesProcessed}/${progress.totalRecipes}`);
      }
    );

    const totalTime = Date.now() - startTime;
    
    console.log(`✅ Two-stage search completed in ${totalTime}ms`);
    console.log(`Found ${result.recipes.length} valid recipes`);

    // Prepare detailed response
    const response = {
      success: true,
      searchRequest,
      options,
      result: {
        ...result,
        recipes: result.recipes.map(recipe => ({
          title: recipe.title,
          description: recipe.description?.substring(0, 200) + '...',
          ingredientCount: recipe.ingredients.length,
          instructionCount: recipe.instructions.length,
          totalTimeMinutes: recipe.metadata?.totalTime || 0,
          servings: recipe.metadata?.servings || 0,
          imageUrl: recipe.images?.[0] || null,
          culturalOrigin: recipe.culturalOrigin,
          source: recipe.source,
          sourceUrl: recipe.sourceUrl
        }))
      },
      performance: {
        totalTimeMs: totalTime,
        averageTimePerRecipe: result.recipes.length > 0 ? totalTime / result.recipes.length : 0,
        progressUpdates
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Two-stage workflow test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Two-Stage Recipe Search Workflow Test API',
    usage: {
      method: 'POST',
      body: {
        query: 'string (optional) - search query',
        culturalCuisine: 'string (optional) - cuisine type',
        dietaryRestrictions: 'string[] (optional) - dietary restrictions',
        maxResults: 'number (optional, default: 3) - max recipes to return',
        maxTimeMinutes: 'number (optional) - max cooking time',
        useGroq: 'boolean (optional, default: true) - use Groq for parsing',
        maxConcurrent: 'number (optional, default: 3) - parallel processing limit',
        timeoutMs: 'number (optional, default: 15000) - parsing timeout',
        enableFallback: 'boolean (optional, default: true) - enable Groq->Perplexity fallback'
      }
    },
    examples: [
      {
        name: 'Basic search',
        body: {
          query: 'vegetarian pasta recipes',
          maxResults: 2
        }
      },
      {
        name: 'Cultural cuisine search',
        body: {
          query: 'dinner recipes',
          culturalCuisine: 'italian',
          dietaryRestrictions: ['vegetarian'],
          maxTimeMinutes: 45
        }
      },
      {
        name: 'Performance test with Perplexity',
        body: {
          query: 'quick breakfast recipes',
          useGroq: false,
          maxResults: 3,
          timeoutMs: 20000
        }
      }
    ]
  });
}