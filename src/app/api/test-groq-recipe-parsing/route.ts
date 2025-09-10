/**
 * Test API endpoint for Groq recipe parsing
 * 
 * Tests Groq AI with web search capabilities for recipe extraction
 * and compares performance with Perplexity API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { groqRecipeClient } from '@/lib/integrations/groq-recipe-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      url = 'https://www.allrecipes.com/recipe/16354/easy-meatloaf/',
      culturalCuisine = 'american'
    } = body;

    console.log(`🧪 Testing Groq recipe parsing`);
    console.log(`📍 URL: ${url}`);
    console.log(`🌍 Cultural cuisine: ${culturalCuisine}`);

    const startTime = Date.now();

    try {
      const result = await groqRecipeClient.parseRecipeFromUrl(url, culturalCuisine);
      const totalTime = Date.now() - startTime;

      console.log('✅ Groq parsing test results:');
      console.log(`   Recipe Title: ${result.title}`);
      console.log(`   Ingredients: ${result.ingredients.length}`);
      console.log(`   Instructions: ${result.instructions.length}`);
      console.log(`   Images: ${result.images.length}`);
      console.log(`   Parse time: ${totalTime}ms`);

      return NextResponse.json({
        success: true,
        results: {
          recipe: {
            title: result.title,
            description: result.description,
            culturalContext: result.culturalContext,
            ingredients: result.ingredients,
            instructions: result.instructions,
            metadata: result.metadata,
            images: result.images,
            ingredientCount: result.ingredients.length,
            instructionCount: result.instructions.length,
            imageCount: result.images.length,
            totalTimeMinutes: result.metadata.totalTimeMinutes,
            servings: result.metadata.servings,
            difficulty: result.metadata.difficulty
          },
          performance: {
            parseTime: totalTime,
            extractionTime: result.extractionTimeMs,
            method: result.extractionMethod
          },
          checks: {
            hasTitle: !!result.title,
            hasIngredients: result.ingredients.length > 0,
            hasInstructions: result.instructions.length > 0,
            hasImages: result.images.length > 0,
            meetsRequirements: !!result.title && result.ingredients.length > 0 && result.instructions.length > 0
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        parseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Groq recipe parsing test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Groq Recipe Parsing Test API',
    usage: 'POST with { url, culturalCuisine }',
    example: {
      url: 'https://www.allrecipes.com/recipe/16354/easy-meatloaf/',
      culturalCuisine: 'american'
    },
    model: 'groq/compound with web search'
  });
}