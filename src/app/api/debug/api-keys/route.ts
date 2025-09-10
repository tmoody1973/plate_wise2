import { NextResponse } from 'next/server';

export async function GET() {
  const apiKeys = {
    perplexity: !!process.env.PERPLEXITY_API_KEY,
    perplexityLength: process.env.PERPLEXITY_API_KEY?.length || 0,
    openai: !!process.env.OPENAI_API_KEY,
    elevenlabs: !!process.env.ELEVENLABS_API_KEY,
    googlePlaces: !!process.env.GOOGLE_PLACES_API_KEY,
    kroger: !!process.env.KROGER_CLIENT_ID,
    tavily: !!process.env.TAVILY_API_KEY,
    aws: !!process.env.AWS_ACCESS_KEY_ID,
    webscraping_ai: !!process.env.WEBSCRAPING_AI_API_KEY,
    webscraping_ai_length: process.env.WEBSCRAPING_AI_API_KEY?.length || 0
  };

  return NextResponse.json({
    message: 'API Keys Configuration Status',
    keys: apiKeys,
    timestamp: new Date().toISOString()
  });
}