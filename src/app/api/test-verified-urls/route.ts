import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🧪 Testing VERIFIED URLs approach (what actually works)...');
    
    // Use your VERIFIED working URLs (from your production fallback)
    const verifiedUrls = [
      {
        title: "Classic Chicken Tacos",
        url: "https://www.allrecipes.com/recipe/70734/chicken-soft-tacos/",
        cuisine: "Mexican",
        estimatedTime: 30,
        description: "Simple and authentic chicken tacos"
      },
      {
        title: "Indian Chicken Curry",
        url: "https://www.allrecipes.com/recipe/212721/indian-chicken-curry/",
        cuisine: "Indian",
        estimatedTime: 40,
        description: "Aromatic Indian chicken curry"
      },
      {
        title: "Chicken Parmesan",
        url: "https://www.allrecipes.com/recipe/223042/chicken-parmesan/",
        cuisine: "Italian",
        estimatedTime: 35,
        description: "Crispy breaded chicken with marinara"
      }
    ];

    console.log('✅ STAGE 1: Using verified URLs (no Perplexity needed)');
    
    // STAGE 2: Use WebScraping.AI to get recipe data from these WORKING URLs
    const webscrapeApiKey = process.env.WEBSCRAPING_AI_API_KEY;
    
    if (!webscrapeApiKey) {
      return NextResponse.json({
        success: false,
        error: 'WebScraping.AI API key not configured',
        stage1: { verifiedUrls },
        stage2: { error: 'No API key' }
      });
    }

    console.log('📤 STAGE 2: Scraping verified URLs with WebScraping.AI...');
    
    const stage2Results = [];
    
    for (const recipe of verifiedUrls) {
      try {
        console.log(`🔄 Scraping: ${recipe.url}`);
        
        const response = await fetch('https://api.webscraping.ai/ai/fields', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${webscrapeApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: recipe.url,
            fields: [
              'title',
              'ingredients',
              'instructions', 
              'servings',
              'prep_time',
              'cook_time',
              'image'
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          
          stage2Results.push({
            originalTitle: recipe.title,
            url: recipe.url,
            scrapedData: {
              title: data.title || recipe.title,
              ingredients: data.ingredients || [],
              instructions: data.instructions || [],
              servings: data.servings || 4,
              prepTime: data.prep_time || recipe.estimatedTime,
              cookTime: data.cook_time || 0,
              image: data.image || null
            },
            success: true,
            source: 'WebScraping.AI'
          });
          
          console.log(`✅ Successfully scraped: ${recipe.title}`);
        } else {
          const errorText = await response.text();
          console.error(`❌ Scraping failed for ${recipe.url}:`, errorText);
          
          stage2Results.push({
            originalTitle: recipe.title,
            url: recipe.url,
            success: false,
            error: `API error: ${response.status}`,
            source: 'WebScraping.AI'
          });
        }
      } catch (error) {
        console.error(`❌ Scraping error for ${recipe.url}:`, error);
        
        stage2Results.push({
          originalTitle: recipe.title,
          url: recipe.url,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          source: 'WebScraping.AI'
        });
      }
    }

    const successfulScrapes = stage2Results.filter(r => r.success).length;
    
    return NextResponse.json({
      success: true,
      approach: 'Verified URLs + WebScraping.AI (Production Method)',
      stage1: {
        method: 'Verified URLs (no AI generation)',
        urls: verifiedUrls,
        count: verifiedUrls.length,
        allUrlsWork: true
      },
      stage2: {
        method: 'WebScraping.AI /ai/fields',
        results: stage2Results,
        successfulScrapes,
        successRate: `${successfulScrapes}/${verifiedUrls.length}`,
        scrapingWorks: successfulScrapes > 0
      },
      summary: {
        stage1Success: true, // Verified URLs always work
        stage2Success: successfulScrapes > 0,
        overallSuccess: successfulScrapes > 0,
        workingRecipes: stage2Results.filter(r => r.success)
      }
    });

  } catch (error) {
    console.error('❌ Verified URLs test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}