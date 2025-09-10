import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const apiKey = process.env.WEBSCRAPING_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'WebScraping.AI API key not configured' }, { status: 500 });
    }

    console.log('🧪 Testing raw WebScraping.AI API for:', url);

    const params = new URLSearchParams({
      api_key: apiKey,
      url: url,
      timeout: '10000',
      js: 'true',
      js_timeout: '2000',
      format: 'json'
    });

    const response = await fetch(`https://api.webscraping.ai/text?${params}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    console.log('📡 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return NextResponse.json({
        success: false,
        error: `API Error: ${response.status}`,
        details: errorText
      }, { status: response.status });
    }

    const data = await response.json();
    
    console.log('📄 Raw response keys:', Object.keys(data));
    console.log('📄 Response summary:', {
      hasText: !!data.text,
      textLength: data.text?.length || 0,
      hasHtml: !!data.html,
      htmlLength: data.html?.length || 0,
      status: data.status,
      url: data.url
    });

    return NextResponse.json({
      success: true,
      url,
      rawResponse: data,
      summary: {
        hasText: !!data.text,
        textLength: data.text?.length || 0,
        hasHtml: !!data.html,
        htmlLength: data.html?.length || 0,
        status: data.status,
        responseUrl: data.url
      }
    });

  } catch (error) {
    console.error('❌ Raw WebScraping.AI test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Raw API test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Raw WebScraping.AI Test Endpoint',
    usage: 'POST with { "url": "https://example.com" } to test raw API response'
  });
}