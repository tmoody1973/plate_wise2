import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    const testUrl = url || "https://www.whats4eats.com/breads/okonomiyaki-recipe";
    
    const WSAI_KEY = process.env.WEBSCRAPING_AI_API_KEY;
    if (!WSAI_KEY) {
      return NextResponse.json({ error: 'WEBSCRAPING_AI_API_KEY not found' }, { status: 400 });
    }
    
    const fields = {
      "ingredients": "ingredients",
      "image-url": "image url",
      "instructions": "full receipe instructions or directions",
      "servings": "number of servings for the recipe",
      "title": "recipe title",
      "recipe url": "link to recipe"
    };

    const queryParams = new URLSearchParams({
      api_key: WSAI_KEY,
      url: testUrl,
      timeout: "10000",
      js: "true",
      js_timeout: "2000",
      fields: JSON.stringify(fields),
      format: "json"
    });

    console.log('🔍 WebScraping.AI request URL:', `https://api.webscraping.ai/ai/fields?${queryParams.toString()}`);

    const response = await fetch(`https://api.webscraping.ai/ai/fields?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WebScraping.AI error:', response.status, errorText);
      return NextResponse.json({ 
        error: `WebScraping.AI error: ${response.status}`,
        details: errorText
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ WebScraping.AI raw response:', JSON.stringify(data, null, 2));

    return NextResponse.json({
      success: true,
      url: testUrl,
      rawResponse: data,
      fieldsRequested: fields
    });

  } catch (error) {
    console.error('❌ Raw WebScraping.AI test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}