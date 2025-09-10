import { NextRequest, NextResponse } from 'next/server';
import { perplexityRecipeExtractor } from '@/lib/integrations/perplexity-recipe-extractor';

export async function POST(request: NextRequest) {
  try {
    const { url, urls } = await request.json();
    
    if (!url && !urls) {
      return NextResponse.json({ error: 'URL or URLs array is required' }, { status: 400 });
    }

    console.log('🧪 Testing Perplexity-only recipe extraction...');

    let results;
    const startTime = Date.now();

    if (urls && Array.isArray(urls)) {
      // Test multiple URLs
      results = await perplexityRecipeExtractor.extractMultipleRecipes(urls, 2);
    } else {
      // Test single URL
      const result = await perplexityRecipeExtractor.extractRecipe(url);
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
        successfulExtractions: results.filter(r => r.ingredients.length > 0 || r.instructions.length > 0).length,
        realDataExtractions: results.filter(r => r.extractionMethod === 'perplexity-direct').length
      }
    });

  } catch (error) {
    console.error('❌ Perplexity extraction test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Perplexity extraction failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Perplexity-Only Recipe Extraction Test Endpoint',
    usage: 'POST with { "url": "..." } for single extraction or { "urls": [...] } for multiple',
    features: ['Direct URL parsing', 'Fast extraction', 'Caching', 'Parallel processing']
  });
}