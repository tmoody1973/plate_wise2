import { NextRequest, NextResponse } from 'next/server';
import { ogImageExtractor } from '@/lib/integrations/og-image-extractor';

export async function POST(request: NextRequest) {
  try {
    const { url, urls } = await request.json();
    
    if (!url && !urls) {
      return NextResponse.json({ error: 'URL or URLs array is required' }, { status: 400 });
    }

    console.log('🧪 Testing Open Graph image extraction...');

    let results;
    const startTime = Date.now();

    if (urls && Array.isArray(urls)) {
      // Test multiple URLs
      const ogResults = await ogImageExtractor.extractMultipleOGImages(urls);
      results = Array.from(ogResults.entries()).map(([url, ogData]) => ({
        url,
        ...ogData
      }));
    } else {
      // Test single URL
      const ogData = await ogImageExtractor.extractOGImage(url);
      results = [{ url, ...ogData }];
    }

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      totalExtractionTimeMs: totalTime,
      results,
      summary: {
        totalUrls: results.length,
        withOGImages: results.filter(r => r.ogImage).length,
        withTwitterImages: results.filter(r => r.twitterImage).length,
        withAnyImage: results.filter(r => r.bestImage).length,
        avgExtractionTime: Math.round(totalTime / results.length)
      }
    });

  } catch (error) {
    console.error('❌ OG image extraction test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'OG image extraction failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Open Graph Image Extraction Test Endpoint',
    usage: 'POST with { "url": "..." } for single extraction or { "urls": [...] } for multiple',
    features: ['og:image extraction', 'twitter:image extraction', 'Meta tag parsing', 'URL resolution']
  });
}