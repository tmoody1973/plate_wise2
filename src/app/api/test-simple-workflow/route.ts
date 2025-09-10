/**
 * Simplified two-stage workflow test to debug the issue
 * Bypasses complex validation to see where recipes are being lost
 */

import { NextRequest, NextResponse } from 'next/server';
import { TavilyService } from '@/lib/integrations/tavily-service';
import { GroqRecipeService } from '@/lib/integrations/groq-recipe-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = body.query || 'mac and cheese recipe';
    
    console.log('🚀 Starting simplified workflow test...');
    
    // Step 1: Test Tavily URL discovery
    console.log('Step 1: Testing Tavily URL discovery...');
    const tavilyService = new TavilyService();
    
    const urls = await tavilyService.findRecipeUrls(query, {
      maxResults: 3,
      searchDepth: 'basic',
      includeImages: true
    });
    
    console.log(`Found ${urls.length} URLs:`, urls);
    
    if (urls.length === 0) {
      return NextResponse.json({
        success: false,
        step: 'tavily_discovery',
        message: 'No URLs found by Tavily',
        query,
        urls: []
      });
    }
    
    // Step 2: Test Groq parsing with first URL
    console.log('Step 2: Testing Groq parsing...');
    const groqService = new GroqRecipeService();
    
    const testUrl = urls[0];
    console.log(`Testing Groq parsing with URL: ${testUrl}`);
    
    try {
      const groqResult = await groqService.parseRecipeFromUrl(testUrl, 'american');
      console.log('Groq parsing successful:', {
        title: groqResult.recipe?.title,
        ingredientCount: groqResult.recipe?.ingredients?.length,
        instructionCount: groqResult.recipe?.instructions?.length
      });
      
      return NextResponse.json({
        success: true,
        step: 'groq_parsing',
        message: 'Groq parsing successful',
        query,
        testUrl,
        urls,
        groqResult: {
          title: groqResult.recipe?.title,
          ingredientCount: groqResult.recipe?.ingredients?.length,
          instructionCount: groqResult.recipe?.instructions?.length,
          hasImages: groqResult.recipe?.images?.length > 0,
          parseTime: groqResult.metadata?.parseTime
        }
      });
      
    } catch (groqError) {
      console.error('Groq parsing failed:', groqError);
      
      return NextResponse.json({
        success: false,
        step: 'groq_parsing',
        message: 'Groq parsing failed',
        query,
        testUrl,
        urls,
        error: groqError instanceof Error ? groqError.message : 'Unknown Groq error'
      });
    }
    
  } catch (error) {
    console.error('❌ Simplified workflow test failed:', error);
    
    return NextResponse.json({
      success: false,
      step: 'general_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Simplified Two-Stage Workflow Test',
    description: 'Tests each step individually to identify where recipes are being lost',
    usage: {
      method: 'POST',
      body: {
        query: 'string (optional, default: "mac and cheese recipe") - search query'
      }
    },
    steps: [
      '1. Test Tavily URL discovery',
      '2. Test Groq parsing with first URL',
      '3. Return detailed results for debugging'
    ]
  });
}