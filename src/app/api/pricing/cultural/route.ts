import { NextRequest, NextResponse } from 'next/server';
import { culturalPricingService } from '@/lib/external-apis/cultural-pricing-service';
import type { CulturalPricingRequest } from '@/lib/external-apis/cultural-pricing-service';

export async function POST(request: NextRequest) {
  try {
    const body: CulturalPricingRequest = await request.json();

    // Validate required fields
    if (!body.ingredients || !Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Ingredients array is required' },
        { status: 400 }
      );
    }

    if (!body.culturalOrigin || !Array.isArray(body.culturalOrigin) || body.culturalOrigin.length === 0) {
      // Be forgiving: default to a general context when not provided
      body.culturalOrigin = ['general'];
    }

    if (!body.userLocation) {
      return NextResponse.json(
        { success: false, error: 'User location is required' },
        { status: 400 }
      );
    }

    if (!body.userProfile) {
      return NextResponse.json(
        { success: false, error: 'User profile is required' },
        { status: 400 }
      );
    }

    console.log(`[Cultural Pricing API] Processing request for ${body.ingredients.length} ingredients from ${body.culturalOrigin.join(', ')} cuisine`);

    // Get cultural pricing analysis
    const pricingResponse = await culturalPricingService.getCulturalPricing(body);

    return NextResponse.json({
      success: true,
      data: pricingResponse,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Cultural Pricing API] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Health check endpoint
    return NextResponse.json({
      success: true,
      message: 'Cultural Pricing API is operational',
      timestamp: new Date().toISOString(),
      features: [
        'Cultural ingredient analysis',
        'Ethnic store discovery',
        'Multi-source pricing comparison',
        'Cultural authenticity scoring',
        'Shopping strategy optimization'
      ]
    });
  } catch (error) {
    console.error('[Cultural Pricing API] Health check error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Service unavailable',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
