import { NextRequest, NextResponse } from 'next/server';
import { aiFields, htmlJsonLdFallback } from '@/lib/integrations/webscraping';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log('🧪 Testing WebScraping.AI extraction for:', url);

    let aiFieldsResult = null;
    let jsonLdResult = null;
    let aiFieldsError = null;
    let jsonLdError = null;

    // Test AI Fields extraction
    try {
      aiFieldsResult = await aiFields(url);
      console.log('✅ AI Fields successful');
    } catch (error) {
      aiFieldsError = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ AI Fields failed:', aiFieldsError);
    }

    // Test JSON-LD fallback
    try {
      jsonLdResult = await htmlJsonLdFallback(url);
      console.log('✅ JSON-LD fallback successful');
    } catch (error) {
      jsonLdError = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ JSON-LD fallback failed:', jsonLdError);
    }

    return NextResponse.json({
      url,
      aiFields: {
        success: !!aiFieldsResult,
        data: aiFieldsResult,
        error: aiFieldsError
      },
      jsonLd: {
        success: !!jsonLdResult,
        data: jsonLdResult,
        error: jsonLdError
      },
      summary: {
        hasIngredients: !!(aiFieldsResult?.ingredients || jsonLdResult?.ingredients),
        hasInstructions: !!(aiFieldsResult?.instructions || jsonLdResult?.instructions),
        hasTitle: !!(aiFieldsResult?.title || jsonLdResult?.title),
        bestMethod: aiFieldsResult ? 'AI Fields' : jsonLdResult ? 'JSON-LD' : 'None'
      }
    });

  } catch (error) {
    console.error('❌ WebScraping test failed:', error);
    
    return NextResponse.json(
      {
        error: 'WebScraping test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'WebScraping.AI Test Endpoint',
    usage: 'POST with { "url": "https://example.com/recipe" } to test extraction'
  });
}