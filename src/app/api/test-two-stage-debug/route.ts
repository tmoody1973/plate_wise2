/**
 * Debug version of two-stage recipe search workflow
 * Shows detailed information about each step including failed recipes
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
      maxResults: body.maxResults || 2,
      maxTimeMinutes: body.maxTimeMinutes
    };

    const options = {
      useGroq: body.useGroq !== false,
      maxConcurrent: 1, // Process one at a time for better debugging
      timeoutMs: body.timeoutMs || 20000,
      enableFallback: body.enableFallback !== false
    };

    console.log('🚀 Starting DEBUG two-stage recipe search workflow...');
    console.log('Search request:', JSON.stringify(searchRequest, null, 2));

    const searchService = new TavilyPerplexitySearchService();
    
    // Capture detailed progress
    const debugInfo: any = {
      urls: [],
      rawRecipes: [],
      validationResults: [],
      finalRecipes: []
    };
    
    const startTime = Date.now();
    const result = await searchService.searchRecipes(
      searchRequest,
      options,
      (progress) => {
        console.log(`🔄 Progress: ${progress.stage} - URLs: ${progress.urlsFound}, Processed: ${progress.recipesProcessed}/${progress.totalRecipes}`);
        if (progress.errors.length > 0) {
          console.log('❌ Errors:', progress.errors);
        }
      }
    );

    const totalTime = Date.now() - startTime;
    
    console.log(`✅ DEBUG search completed in ${totalTime}ms`);
    console.log(`Found ${result.recipes.length} final recipes`);

    // Prepare detailed debug response
    const response = {
      success: true,
      searchRequest,
      options,
      result: {
        ...result,
        recipes: result.recipes.map(recipe => ({
          title: recipe.title,
          description: recipe.description?.substring(0, 150) + '...',
          ingredientCount: recipe.ingredients?.length || 0,
          instructionCount: recipe.instructions?.length || 0,
          totalTimeMinutes: recipe.metadata?.totalTime || 0,
          servings: recipe.metadata?.servings || 0,
          imageUrl: recipe.images?.[0] || null,
          culturalOrigin: recipe.culturalOrigin,
          source: recipe.source,
          sourceUrl: recipe.sourceUrl,
          // Include first few ingredients and instructions for debugging
          sampleIngredients: recipe.ingredients?.slice(0, 3).map(ing => ing.name || ing.text) || [],
          sampleInstructions: recipe.instructions?.slice(0, 2).map(inst => inst.text?.substring(0, 100)) || []
        }))
      },
      debug: {
        totalTimeMs: totalTime,
        detailedTiming: {
          urlDiscovery: 'See console logs',
          contentParsing: 'See console logs',
          validation: 'See console logs'
        },
        tips: [
          'Check console logs for detailed step-by-step information',
          'URLs found but no recipes usually means parsing or validation issues',
          'Try simpler queries like "pasta recipe" or "chicken recipe"',
          'Consider adjusting validation thresholds if recipes are being filtered out'
        ]
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ DEBUG two-stage workflow test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        message: 'Check console logs for detailed error information',
        commonIssues: [
          'API keys not configured properly',
          'Network connectivity issues',
          'Rate limiting from external APIs',
          'Parsing errors in recipe content'
        ]
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Two-Stage Recipe Search DEBUG API',
    description: 'Enhanced debugging version with detailed logging and step-by-step information',
    usage: {
      method: 'POST',
      body: {
        query: 'string (required) - search query',
        culturalCuisine: 'string (optional) - cuisine type',
        dietaryRestrictions: 'string[] (optional) - dietary restrictions',
        maxResults: 'number (optional, default: 2) - max recipes to return',
        maxTimeMinutes: 'number (optional) - max cooking time',
        useGroq: 'boolean (optional, default: true) - use Groq for parsing',
        timeoutMs: 'number (optional, default: 20000) - parsing timeout',
        enableFallback: 'boolean (optional, default: true) - enable Groq->Perplexity fallback'
      }
    },
    debugFeatures: [
      'Sequential processing for better debugging',
      'Detailed console logging at each step',
      'Sample ingredients and instructions in response',
      'Validation details and failure reasons',
      'Performance timing breakdown',
      'Troubleshooting tips and common issues'
    ],
    examples: [
      {
        name: 'Simple debug test',
        body: {
          query: 'pasta recipe',
          maxResults: 1
        }
      },
      {
        name: 'Cultural cuisine debug',
        body: {
          query: 'traditional recipe',
          culturalCuisine: 'italian',
          maxResults: 1
        }
      }
    ]
  });
}