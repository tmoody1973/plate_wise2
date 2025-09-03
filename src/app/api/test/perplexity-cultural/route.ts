import { NextRequest, NextResponse } from 'next/server';
import { perplexityPricingService } from '@/lib/external-apis/perplexity-service';
import type { AdvancedCulturalPricingRequest } from '@/lib/external-apis/perplexity-service';

export async function POST(request: NextRequest) {
  try {
    const body: AdvancedCulturalPricingRequest = await request.json();
    
    console.log('Testing advanced cultural pricing with request:', body);
    
    // Validate required fields
    if (!body.ingredients || !Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      return NextResponse.json(
        { error: 'Ingredients array is required and must not be empty' },
        { status: 400 }
      );
    }
    
    if (!body.location) {
      return NextResponse.json(
        { error: 'Location is required' },
        { status: 400 }
      );
    }
    
    // Call the enhanced Perplexity service
    const result = await perplexityPricingService.getAdvancedCulturalPricing(body);
    
    console.log('Advanced cultural pricing result:', result);
    
    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      requestInfo: {
        ingredientCount: body.ingredients.length,
        culturalContext: body.culturalContext || 'none',
        budgetLimit: body.budgetLimit || 'none',
        prioritizeAuthenticity: body.prioritizeAuthenticity || false
      }
    });
    
  } catch (error) {
    console.error('Advanced cultural pricing API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const healthCheck = await perplexityPricingService.healthCheck();
    
    return NextResponse.json({
      status: 'ok',
      perplexityApiHealthy: healthCheck,
      timestamp: new Date().toISOString(),
      version: '2.0.0-enhanced'
    });
    
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}