import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Starting simple Perplexity debug test...');
    
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!perplexityApiKey) {
      console.log('❌ No Perplexity API key found');
      return NextResponse.json({
        success: false,
        error: 'Perplexity API key not configured',
        debug: {
          hasApiKey: false,
          envVars: Object.keys(process.env).filter(key => key.includes('PERPLEXITY'))
        }
      });
    }

    console.log('✅ API key found, length:', perplexityApiKey.length);
    console.log('🔑 API key preview:', perplexityApiKey.substring(0, 10) + '...');

    // Super simple test - no structured outputs, just basic call
    const testPrompt = 'List 2 popular Italian recipes with their source websites.';

    console.log('📤 Making basic Perplexity API call...');
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'user',
            content: testPrompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      })
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API error response:', errorText);
      return NextResponse.json({
        success: false,
        error: `API error: ${response.status}`,
        details: errorText,
        debug: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        }
      });
    }

    const data = await response.json();
    console.log('📊 Full API response:', JSON.stringify(data, null, 2));

    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    console.log('📝 Content length:', content.length);
    console.log('📝 Content preview:', content.substring(0, 200));
    console.log('🔗 Citations count:', citations.length);
    console.log('🔗 Citations:', citations);

    return NextResponse.json({
      success: true,
      content,
      citations,
      fullResponse: data,
      debug: {
        contentLength: content.length,
        citationsCount: citations.length,
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length || 0,
        messageExists: !!data.choices?.[0]?.message,
        contentExists: !!data.choices?.[0]?.message?.content
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}