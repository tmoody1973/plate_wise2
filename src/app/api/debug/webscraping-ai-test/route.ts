import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing WebScraping.AI recipe scraper...');
    
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    // Import the WebScraping.AI scraper
    const { webScrapingAIRecipeScraperService } = await import('@/lib/meal-planning/webscraping-ai-recipe-scraper');
    
    console.log('🤖 Testing WebScraping.AI scraper with URL:', url);
    const result = await webScrapingAIRecipeScraperService.scrapeRecipe(url);
    
    console.log('✅ WebScraping.AI test result:', {
      success: result.success,
      method: result.scrapingMethod,
      hasData: !!result.data,
      title: result.data?.title,
      ingredientsCount: result.data?.ingredients?.length || 0,
      instructionsCount: result.data?.instructions?.length || 0,
      error: result.error
    });
    
    return NextResponse.json({
      success: true,
      result
    });
    
  } catch (error) {
    console.error('❌ WebScraping.AI test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}