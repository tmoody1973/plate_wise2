import { NextRequest, NextResponse } from 'next/server';
import { webScrapingHtmlService } from '@/lib/integrations/webscraping-html';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log('🧪 Testing hybrid extraction (WebScraping.AI HTML + Perplexity parsing) for:', url);

    const startTime = Date.now();
    const recipeData = await webScrapingHtmlService.extractRecipe(url);
    const extractionTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      url,
      extractionTimeMs: extractionTime,
      recipeData,
      summary: {
        hasTitle: !!recipeData.title,
        ingredientsCount: recipeData.ingredients.length,
        instructionsCount: recipeData.instructions.length,
        hasServings: !!recipeData.servings,
        hasTime: !!recipeData.totalTimeMinutes,
        hasDescription: !!recipeData.description,
        hasImage: !!recipeData.imageUrl
      }
    });

  } catch (error) {
    console.error('❌ Hybrid extraction test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Hybrid extraction failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Hybrid Recipe Extraction Test Endpoint',
    usage: 'POST with { "url": "https://example.com/recipe" } to test WebScraping.AI HTML + Perplexity parsing',
    method: 'WebScraping.AI (HTML) → Perplexity AI (Parsing)'
  });
}