import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY || '';
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'No Perplexity API key configured'
      });
    }

    // Simple test to Perplexity API
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
            role: 'user',
            content: 'List 2 popular Italian pasta recipes with their names only, in JSON format: {"recipes": [{"title": "name"}]}'
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({
        success: false,
        error: `Perplexity API error: ${response.status}`,
        details: error
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Try to parse the content
    let recipes = null;
    try {
      recipes = JSON.parse(content);
    } catch (e) {
      recipes = { raw: content };
    }

    return NextResponse.json({
      success: true,
      apiKeyLength: apiKey.length,
      response: {
        model: data.model,
        content: recipes,
        citations: data.citations || []
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}