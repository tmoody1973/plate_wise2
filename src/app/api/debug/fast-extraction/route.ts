import { NextRequest, NextResponse } from 'next/server';
import { fastRecipeExtractor } from '@/lib/integrations/fast-recipe-extractor';

export async function POST(request: NextRequest) {
  try {
    const { url, urls } = await request.json();
    
    if (!url && !urls) {
      return NextResponse.json({ error: 'URL or URLs array is required' }, { status: 400 });
    }

    console.log('🧪 Testing fast recipe extraction...');

    let results;
    const startTime = Date.now();

    if (urls && Array.isArray(urls)) {
      // Test multiple URLs
      results = await fastRecipeExtractor.extractMultipleRecipes(urls, 2);
    } else {
      // Test single URL
      const result = await fastRecipeExtractor.extractRecipe(url);
      results = [result];
    }

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      totalExtractionTimeMs: totalTime,
      results,
      summary: {
        totalRecipes: results.length,
        methods: results.reduce((acc: Record<string, number>, result) => {
          acc[result.extractionMethod] = (acc[result.extractionMethod] || 0) + 1;
          return acc;
        }, {}),
        avgExtractionTime: Math.round(results.reduce((sum, r) => sum + r.extractionTimeMs, 0) / results.length),
        successfulExtractions: results.filter(r => r.ingredients.length > 0 || r.instructions.length > 0).length
      }
    });

  } catch (error) {
    console.error('❌ Fast extraction test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Fast extraction failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Fast Recipe Extraction Test Endpoint',
    usage: 'POST with { "url": "..." } for single extraction or { "urls": [...] } for multiple',
    features: ['Caching', 'Parallel Processing', 'Multiple Extraction Methods', 'Timeouts']
  });
}