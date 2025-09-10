import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'PERPLEXITY_API_KEY not found in environment variables'
      });
    }

    console.log('Testing Perplexity API with key:', apiKey.slice(0, 10) + '...');

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Respond with a simple JSON object.'
          },
          {
            role: 'user',
            content: 'Generate a simple recipe for pasta. Return only JSON with title, ingredients (array), and instructions (array).'
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    console.log('Perplexity API response status:', response.status);
    console.log('Perplexity API response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error response:', errorText);
      
      return NextResponse.json({
        success: false,
        error: `Perplexity API error: ${response.status} - ${response.statusText}`,
        details: errorText,
        status: response.status
      });
    }

    const data = await response.json();
    console.log('Perplexity API success response:', data);

    return NextResponse.json({
      success: true,
      data,
      message: 'Perplexity API is working correctly'
    });

  } catch (error) {
    console.error('Perplexity API test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}