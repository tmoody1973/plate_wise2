/**
 * Test API endpoint for Groq compound-mini model recipe parsing
 * Shows direct results from Groq without validation filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { GroqRecipeService } from '@/lib/integrations/groq-recipe-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, culturalCuisine } = body;

    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URL is required'
      }, { status: 400 });
    }

    console.log(`🤖 Testing Groq compound-mini with URL: ${url}`);
    
    const groqService = new GroqRecipeService();
    const startTime = Date.now();
    
    const recipe = await groqService.parseRecipeFromUrl(url, {
      culturalCuisine,
      dietaryRestrictions: []
    });
    
    const totalTime = Date.now() - startTime;
    
    console.log(`✅ Groq compound-mini completed in ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      model: 'groq/compound-mini',
      url,
      culturalCuisine,
      recipe: {
        title: recipe.title,
        description: recipe.description?.substring(0, 200) + '...',
        culturalOrigin: recipe.culturalOrigin,
        ingredientCount: recipe.ingredients.length,
        instructionCount: recipe.instructions.length,
        totalTimeMinutes: recipe.metadata?.totalTime || 0,
        servings: recipe.metadata?.servings || 0,
        imageUrl: recipe.images?.[0] || null,
        source: recipe.source,
        extractionMethod: recipe.extractionMethod || 'groq-compound-mini'
      },
      performance: {
        totalTimeMs: totalTime,
        extractionTimeMs: recipe.extractionTimeMs || totalTime
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Groq compound-mini test failed:', error);
    
    return NextResponse.json({
      success: false,
      model: 'groq/compound-mini',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Groq Compound-Mini Recipe Parsing Test API',
    model: 'groq/compound-mini',
    usage: {
      method: 'POST',
      body: {
        url: 'string (required) - recipe URL to parse',
        culturalCuisine: 'string (optional) - cuisine type for cultural context'
      }
    },
    examples: [
      {
        name: 'Basic recipe parsing',
        body: {
          url: 'https://www.allrecipes.com/recipe/213742/cheesy-chicken-broccoli-casserole/'
        }
      },
      {
        name: 'Cultural cuisine parsing',
        body: {
          url: 'https://www.foodnetwork.com/recipes/alton-brown/baked-macaroni-and-cheese-recipe-1939524',
          culturalCuisine: 'american'
        }
      }
    ]
  });
}