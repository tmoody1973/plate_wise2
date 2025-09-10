/**
 * Basic Perplexity API connectivity test
 * Tests the most minimal Perplexity API call to isolate connectivity issues
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing basic Perplexity API connectivity...');
    
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'PERPLEXITY_API_KEY not found in environment variables'
      }, { status: 500 });
    }

    console.log('✅ API key found, making basic request...');

    const startTime = Date.now();
    
    // Make the simplest possible Perplexity API call
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'user',
            content: 'What is 2+2?'
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    const responseTime = Date.now() - startTime;
    console.log(`📊 Response received in ${responseTime}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Perplexity API error:', response.status, errorText);
      
      return NextResponse.json({
        success: false,
        error: `Perplexity API error: ${response.status} ${response.statusText}`,
        details: errorText,
        responseTime
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Perplexity API response received successfully');

    return NextResponse.json({
      success: true,
      message: 'Perplexity API is working correctly',
      responseTime,
      model: 'sonar-pro',
      response: {
        content: data.choices?.[0]?.message?.content || 'No content',
        usage: data.usage
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Basic Perplexity test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error.name || 'UnknownError',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Basic Perplexity API Connectivity Test',
    description: 'Tests the most minimal Perplexity API call to verify connectivity',
    usage: {
      method: 'POST',
      body: 'No body required - uses hardcoded simple test'
    },
    purpose: 'Isolate connectivity issues vs complex recipe parsing issues'
  });
}