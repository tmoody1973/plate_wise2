/**
 * Test endpoint for Tavily search functionality
 * Tests the complete URL discovery pipeline with quality filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { TavilyService } from '@/lib/integrations/tavily-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query = 'vegetarian pasta recipes', maxResults = 3 } = body;

    console.log('🔍 Testing Tavily search with query:', query);

    const tavilyService = new TavilyService();
    
    // Test search context
    const searchContext = {
      culturalCuisine: 'italian',
      dietaryRestrictions: ['vegetarian'],
      mealTypes: ['dinner'],
      maxTimeMinutes: 45
    };

    const startTime = Date.now();
    
    // Perform search
    const urls = await tavilyService.findRecipeUrls(query, searchContext, {
      maxResults,
      searchDepth: 'basic',
      includeImages: true
    });

    const searchTime = Date.now() - startTime;

    console.log(`✅ Tavily search completed in ${searchTime}ms`);
    console.log(`📋 Found ${urls.length} URLs:`);
    urls.forEach((url, i) => console.log(`  ${i + 1}. ${url}`));

    // Test health status
    const healthStatus = tavilyService.getHealthStatus();

    return NextResponse.json({
      success: true,
      results: {
        query,
        searchContext,
        urls,
        urlCount: urls.length,
        searchTimeMs: searchTime,
        healthStatus
      },
      message: `Found ${urls.length} recipe URLs in ${searchTime}ms`
    });

  } catch (error) {
    console.error('❌ Tavily search test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error.message,
        type: 'TAVILY_SEARCH_ERROR'
      }
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Tavily Search Test Endpoint',
    usage: 'POST with { query: string, maxResults?: number }',
    example: {
      query: 'vegetarian pasta recipes',
      maxResults: 3
    }
  });
}