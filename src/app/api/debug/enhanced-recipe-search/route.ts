import { NextRequest, NextResponse } from 'next/server';
import { enhancedRecipeSearchService } from '@/lib/meal-planning/enhanced-recipe-search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🧪 Testing enhanced recipe search:', body);

    // Test with a simple query
    const testQuery = body.query || 'simple pasta recipe';
    
    const result = await enhancedRecipeSearchService.searchRecipes({
      query: testQuery,
      maxResults: 1,
      difficulty: 'easy'
    });

    console.log('✅ Enhanced recipe search test successful:', {
      recipesFound: result.recipes.length,
      query: testQuery
    });

    return NextResponse.json({
      success: true,
      result,
      testQuery,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Enhanced recipe search test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Enhanced Recipe Search Debug Endpoint',
    description: 'Test the enhanced recipe search service',
    usage: {
      'POST /api/debug/enhanced-recipe-search': {
        body: {
          query: 'string (optional) - Recipe search query, defaults to "simple pasta recipe"'
        }
      }
    }
  });
}