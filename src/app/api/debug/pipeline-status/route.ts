import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const perplexityKey = process.env.PERPLEXITY_API_KEY;
    const webscrapingKey = process.env.WEBSCRAPING_AI_API_KEY;
    
    return NextResponse.json({
      status: 'Pipeline Status Check',
      environment: {
        perplexityApiKey: perplexityKey ? 'Configured ✅' : 'Missing ❌',
        webscrapingApiKey: webscrapingKey ? 'Configured ✅' : 'Missing ❌',
        nodeEnv: process.env.NODE_ENV || 'development'
      },
      pipeline: {
        stage1: 'Perplexity AI - Recipe URL Discovery',
        stage2: 'WebScraping.AI - Recipe Data Extraction',
        fallback: 'Cultural Mock Recipes'
      },
      endpoints: {
        test: '/api/meal-plans/test-pipeline',
        production: '/api/meal-plans/generate-v2',
        legacy: '/api/meal-plans/generate'
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'Error checking pipeline status',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}