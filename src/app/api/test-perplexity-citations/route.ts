import { NextRequest, NextResponse } from 'next/server';

// Simple test endpoint that doesn't require authentication
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🧪 Testing Perplexity citations directly...');
    
    // Test the Perplexity API directly with citations
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    
    if (!perplexityApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Perplexity API key not configured',
        citations: [],
        testMode: true
      });
    }

    // Use the ACTUAL working approach from your recipe URL service
    const cuisineList = body.culturalCuisines?.join(', ') || 'international';
    const testPrompt = `Find 3 REAL, WORKING recipe URLs from established cooking websites. CRITICAL: Only return URLs that you are CERTAIN exist and work.

Requirements:
- Cultural cuisines: ${cuisineList}
- Dietary restrictions: ${body.dietaryRestrictions?.join(', ') || 'None'}
- Maximum cooking time: 60 minutes

VERIFIED SOURCES ONLY (use actual URLs you know exist):
- Food Network: foodnetwork.com (use real recipe URLs with actual recipe IDs)
- AllRecipes: allrecipes.com (use real recipe numbers)
- BBC Good Food: bbcgoodfood.com (use actual recipe paths)
- Serious Eats: seriouseats.com (use real article URLs)
- Bon Appétit: bonappetit.com (use actual recipe URLs)

CRITICAL RULES:
1. Only return URLs you have verified exist and work
2. Use specific recipe IDs/paths from these major sites
3. Do NOT construct or guess URL patterns
4. Use complete, properly formatted URLs (include https://)

Focus on authentic cultural recipes from these major sites.`;

    console.log('🔄 Calling Perplexity API with proven structured approach...');
    
    // Simplified schema based on proven Python example
    const schema = {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          ingredients: {
            type: "array",
            items: { type: "string" }
          },
          instructions: {
            type: "array", 
            items: { type: "string" }
          },
          source_url: { type: "string" }
        },
        required: ["name", "ingredients", "instructions", "source_url"]
      }
    };

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro',  // Using sonar-pro which better supports structured outputs
        messages: [
          {
            role: 'user',
            content: testPrompt
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "recipe_urls",
            schema: {
              type: "object",
              properties: {
                recipes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      url: { type: "string" },
                      cuisine: { type: "string" },
                      estimatedTime: { type: "number" },
                      description: { type: "string" }
                    },
                    required: ["title", "url", "cuisine", "estimatedTime", "description"]
                  }
                },
                confidence: {
                  type: "string",
                  enum: ["high", "medium", "low"]
                }
              },
              required: ["recipes", "confidence"]
            }
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Perplexity API error:', response.status, errorText);
      return NextResponse.json({
        success: false,
        error: `Perplexity API error: ${response.status}`,
        details: errorText,
        citations: []
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    console.log('📚 Perplexity response received:');
    console.log('📝 Raw content:', content);
    console.log('🔗 Citations count:', citations.length);
    console.log('📋 Citations:', citations);

    // Parse the structured JSON response (your WORKING production method)
    let recipes: any[] = [];
    let sources: any[] = [];

    try {
      const parsedContent = JSON.parse(content);
      recipes = parsedContent.recipes || [];
      
      console.log('✅ Successfully parsed structured JSON output:');
      console.log('🍽️ Recipes:', recipes.length);
      
      // Log each recipe with its source URL
      recipes.forEach((recipe: any, index: number) => {
        console.log(`📝 Recipe ${index + 1}: "${recipe.title}" -> ${recipe.url}`);
      });
      
      // Extract sources from recipes
      sources = recipes
        .filter((recipe: any) => recipe.url)
        .map((recipe: any) => ({
          url: recipe.url,
          title: recipe.title,
          description: recipe.description
        }));
      
    } catch (parseError) {
      console.log('⚠️ Failed to parse structured JSON:', parseError);
      console.log('Raw content:', content);
      recipes = [];
      sources = [];
    }

    // Determine success based on structured output with URLs
    const hasStructuredRecipes = recipes.length > 0;
    const recipesWithUrls = recipes.filter((r: any) => r.url).length;
    const success = hasStructuredRecipes && recipesWithUrls > 0;

    return NextResponse.json({
      success,
      content,
      citations,
      recipes,
      sources,
      stats: {
        contentLength: content.length,
        citationsCount: citations.length,
        recipesCount: recipes.length,
        sourcesCount: sources.length,
        recipesWithUrls
      },
      testMode: true,
      debug: {
        hasStructuredRecipes,
        parseError: recipes.length === 0 ? 'Failed to parse JSON or empty array' : null,
        rawContentPreview: content.substring(0, 200) + '...'
      }
    });

  } catch (error) {
    console.error('❌ Test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      citations: []
    }, { status: 500 });
  }
}

