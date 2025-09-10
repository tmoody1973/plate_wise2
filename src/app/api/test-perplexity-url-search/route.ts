/**
 * Test Perplexity API for URL retrieval + recipe parsing
 * Uses Perplexity's web search to find recipe URLs and parse content in one step
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = body.query || 'mac and cheese recipe';
    const maxResults = body.maxResults || 3;
    
    console.log('🔍 Testing Perplexity URL search + parsing...');
    console.log(`Query: "${query}", Max Results: ${maxResults}`);
    
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'PERPLEXITY_API_KEY not found'
      }, { status: 500 });
    }

    const startTime = Date.now();
    
    // Use Perplexity to both find URLs and extract recipe data
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro', // Advanced model with web search
        messages: [
          {
            role: 'system',
            content: `You are a recipe search and extraction expert. Find ${maxResults} high-quality recipe URLs for the given query and extract basic recipe information. Return ONLY valid JSON in this exact format:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "url": "https://example.com/recipe",
      "description": "Brief description",
      "ingredients": ["ingredient 1", "ingredient 2"],
      "instructions": ["step 1", "step 2"],
      "cookTime": "30 minutes",
      "servings": 4,
      "source": "website name"
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Find ${maxResults} high-quality ${query} with complete ingredients and instructions. Include the source URLs. Focus on reputable cooking websites like AllRecipes, Food Network, Simply Recipes, etc.`
          }
        ],
        max_tokens: 2000,
        temperature: 0.2,
        return_citations: true, // Get source URLs
        return_images: true,
        search_domain_filter: [
          'allrecipes.com',
          'foodnetwork.com',
          'simplyrecipes.com',
          'bonappetit.com',
          'epicurious.com',
          'food.com',
          'delish.com',
          'tasteofhome.com'
        ]
      }),
      signal: AbortSignal.timeout(25000) // 25 second timeout
    });

    const responseTime = Date.now() - startTime;
    console.log(`📊 Perplexity response received in ${responseTime}ms`);

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
    console.log('✅ Perplexity response received');

    // Extract the content and try to parse as JSON
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];
    
    console.log('📝 Raw content length:', content.length);
    console.log('🔗 Citations found:', citations.length);

    let parsedRecipes = null;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedRecipes = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.warn('⚠️ Failed to parse JSON from response:', parseError);
    }

    // Prepare response with both parsed recipes and raw data
    const result = {
      success: true,
      method: 'perplexity-url-search',
      query,
      responseTime,
      model: 'sonar-pro',
      
      // Parsed recipe data (if successful)
      recipes: parsedRecipes?.recipes || [],
      recipeCount: parsedRecipes?.recipes?.length || 0,
      
      // Raw Perplexity data for debugging
      rawContent: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
      citations: citations.map(citation => ({
        url: citation.url,
        title: citation.title
      })),
      citationCount: citations.length,
      
      // Usage stats
      usage: data.usage,
      
      // Analysis
      analysis: {
        contentParsed: !!parsedRecipes,
        hasRecipes: (parsedRecipes?.recipes?.length || 0) > 0,
        hasCitations: citations.length > 0,
        avgRecipeFields: parsedRecipes?.recipes ? 
          parsedRecipes.recipes.reduce((sum, recipe) => 
            sum + Object.keys(recipe).length, 0) / parsedRecipes.recipes.length : 0
      },
      
      timestamp: new Date().toISOString()
    };

    console.log(`🎉 Perplexity URL search completed: ${result.recipeCount} recipes found`);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Perplexity URL search test failed:', error);
    
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
    message: 'Perplexity URL Search + Recipe Parsing Test',
    description: 'Uses Perplexity to both find recipe URLs and extract recipe content in one API call',
    advantages: [
      'Single API call instead of two-stage process',
      'Leverages Perplexity web search capabilities',
      'Gets citations (source URLs) automatically',
      'Can filter by trusted domains',
      'Potentially faster than Tavily + parsing'
    ],
    usage: {
      method: 'POST',
      body: {
        query: 'string (optional, default: "mac and cheese recipe") - recipe search query',
        maxResults: 'number (optional, default: 3) - max recipes to find'
      }
    },
    examples: [
      {
        name: 'Basic search',
        body: { query: 'vegetarian pasta recipes', maxResults: 2 }
      },
      {
        name: 'Specific cuisine',
        body: { query: 'authentic italian carbonara recipe', maxResults: 1 }
      }
    ]
  });
}